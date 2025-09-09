import { TelegramClient } from 'gramjs';
import { StringSession } from 'gramjs/sessions';
import { Api } from 'gramjs/tl';
import { logger, exponentialBackoff, sleep } from '@numcheck/shared';
import { prisma } from '@numcheck/database';

export interface TGCheckResult {
  status: 'registered' | 'not_registered' | 'unknown';
  meta?: Record<string, any>;
}

interface TGAccount {
  id: string;
  apiId: string;
  apiHash: string;
  sessionString: string;
  proxyUrl?: string;
  dailyLimit: number;
  lastUsedAt?: Date;
  errorCount: number;
}

export class TelegramChecker {
  private clients: Map<string, TelegramClient> = new Map();
  private accountPool: TGAccount[] = [];
  private currentAccountIndex = 0;
  private readonly maxRetries = 3;
  private readonly rateLimitDelay = 3000; // 3 seconds between requests

  async initialize() {
    try {
      // Load active Telegram accounts from database
      const accounts = await prisma.tgAccount.findMany({
        where: { isActive: true },
        orderBy: { lastUsedAt: 'asc' },
      });

      if (accounts.length === 0) {
        logger.warn('No active Telegram accounts found');
        return;
      }

      this.accountPool = accounts.map(account => ({
        id: account.id,
        apiId: account.apiId,
        apiHash: account.apiHash,
        sessionString: account.sessionString, // TODO: Decrypt in production
        proxyUrl: account.proxyUrl || undefined,
        dailyLimit: account.dailyLimit,
        lastUsedAt: account.lastUsedAt || undefined,
        errorCount: account.errorCount,
      }));

      logger.info(`Loaded ${this.accountPool.length} Telegram accounts`);

      // Initialize clients for each account
      for (const account of this.accountPool) {
        await this.initializeClient(account);
      }

    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Telegram checker');
      throw error;
    }
  }

  private async initializeClient(account: TGAccount): Promise<void> {
    try {
      const session = new StringSession(account.sessionString);
      
      const clientOptions: any = {
        connectionRetries: 5,
      };

      // Add proxy if configured
      if (account.proxyUrl) {
        const proxyUrl = new URL(account.proxyUrl);
        clientOptions.proxy = {
          socksType: 5,
          ip: proxyUrl.hostname,
          port: parseInt(proxyUrl.port),
          username: proxyUrl.username || undefined,
          password: proxyUrl.password || undefined,
        };
      }

      const client = new TelegramClient(
        session,
        parseInt(account.apiId),
        account.apiHash,
        clientOptions
      );

      await client.connect();
      
      // Test connection
      await client.getMe();
      
      this.clients.set(account.id, client);
      logger.info(`Initialized Telegram client for account ${account.id}`);

    } catch (error) {
      logger.error({ err: error, accountId: account.id }, 'Failed to initialize Telegram client');
      
      // Increment error count
      await prisma.tgAccount.update({
        where: { id: account.id },
        data: { errorCount: { increment: 1 } },
      });
    }
  }

  async checkNumber(e164: string): Promise<TGCheckResult> {
    if (this.accountPool.length === 0) {
      return {
        status: 'unknown',
        meta: {
          error: 'No Telegram accounts available',
        },
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const account = this.getNextAccount();
      
      if (!account) {
        return {
          status: 'unknown',
          meta: {
            error: 'No available Telegram accounts',
          },
        };
      }

      const client = this.clients.get(account.id);
      
      if (!client) {
        logger.warn(`Client not found for account ${account.id}`);
        continue;
      }

      try {
        logger.debug(`Checking ${e164} with account ${account.id} (attempt ${attempt + 1})`);

        // Check if number is registered on Telegram
        const result = await client.invoke(
          new Api.contacts.ResolvePhone({
            phone: e164.replace('+', ''),
          })
        );

        // Update last used time
        await this.updateAccountUsage(account.id);

        if (result.users && result.users.length > 0) {
          return {
            status: 'registered',
            meta: {
              accountId: account.id,
              userId: result.users[0].id?.toString(),
            },
          };
        } else {
          return {
            status: 'not_registered',
            meta: {
              accountId: account.id,
            },
          };
        }

      } catch (error: any) {
        lastError = error;
        logger.warn(`Telegram check failed for ${e164} with account ${account.id}`, {
          error: error.message,
          attempt: attempt + 1,
        });

        // Handle flood wait
        if (error.message?.includes('FLOOD_WAIT')) {
          const waitTime = this.extractFloodWaitTime(error.message);
          logger.info(`Flood wait detected, waiting ${waitTime}s`);
          
          // Mark account as temporarily unavailable
          await this.handleFloodWait(account.id, waitTime);
          await sleep(waitTime * 1000);
          continue;
        }

        // Handle phone number not found (this is actually a valid result)
        if (error.message?.includes('PHONE_NOT_OCCUPIED')) {
          await this.updateAccountUsage(account.id);
          return {
            status: 'not_registered',
            meta: {
              accountId: account.id,
            },
          };
        }

        // Handle other errors
        await this.handleAccountError(account.id, error);

        // Rate limiting between attempts
        if (attempt < this.maxRetries - 1) {
          await sleep(exponentialBackoff(attempt, this.rateLimitDelay));
        }
      }
    }

    return {
      status: 'unknown',
      meta: {
        error: lastError?.message || 'Unknown error',
        attempts: this.maxRetries,
      },
    };
  }

  private getNextAccount(): TGAccount | null {
    if (this.accountPool.length === 0) return null;

    // Round-robin selection
    const account = this.accountPool[this.currentAccountIndex];
    this.currentAccountIndex = (this.currentAccountIndex + 1) % this.accountPool.length;

    // Check if account is available (not in flood wait, under daily limit, etc.)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // TODO: Implement daily usage tracking
    // For now, just return the account
    return account;
  }

  private async updateAccountUsage(accountId: string): Promise<void> {
    try {
      await prisma.tgAccount.update({
        where: { id: accountId },
        data: { 
          lastUsedAt: new Date(),
          errorCount: 0, // Reset error count on successful use
        },
      });
    } catch (error) {
      logger.error({ err: error, accountId }, 'Failed to update account usage');
    }
  }

  private async handleAccountError(accountId: string, error: Error): Promise<void> {
    try {
      await prisma.tgAccount.update({
        where: { id: accountId },
        data: { 
          errorCount: { increment: 1 },
        },
      });

      // Disable account if too many errors
      const account = await prisma.tgAccount.findUnique({
        where: { id: accountId },
      });

      if (account && account.errorCount >= 10) {
        await prisma.tgAccount.update({
          where: { id: accountId },
          data: { isActive: false },
        });
        
        logger.warn(`Disabled Telegram account ${accountId} due to excessive errors`);
      }
    } catch (err) {
      logger.error({ err, accountId }, 'Failed to handle account error');
    }
  }

  private async handleFloodWait(accountId: string, waitTime: number): Promise<void> {
    // TODO: Implement flood wait tracking
    logger.info(`Account ${accountId} in flood wait for ${waitTime}s`);
  }

  private extractFloodWaitTime(errorMessage: string): number {
    const match = errorMessage.match(/FLOOD_WAIT_(\d+)/);
    return match ? parseInt(match[1]) : 60; // Default to 60 seconds
  }

  async disconnect(): Promise<void> {
    for (const [accountId, client] of this.clients) {
      try {
        await client.disconnect();
        logger.info(`Disconnected Telegram client for account ${accountId}`);
      } catch (error) {
        logger.error({ err: error, accountId }, 'Error disconnecting Telegram client');
      }
    }
    
    this.clients.clear();
  }

  async testConnection(accountId: string): Promise<boolean> {
    const client = this.clients.get(accountId);
    
    if (!client) {
      return false;
    }

    try {
      await client.getMe();
      return true;
    } catch (error) {
      logger.error({ err: error, accountId }, 'Telegram connection test failed');
      return false;
    }
  }
}
