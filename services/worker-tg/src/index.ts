import 'dotenv/config';
import { 
  getRedisClient, 
  initializeRedis, 
  logger, 
  REDIS_STREAMS, 
  REDIS_CONSUMER_GROUPS,
  sleep
} from '@numcheck/shared';
import { prisma } from '@numcheck/database';
import { TelegramChecker } from './tg-checker';

class TelegramWorker {
  private redis = getRedisClient();
  private tgChecker = new TelegramChecker();
  private isRunning = false;
  private consumerName = `tg-worker-${process.pid}`;

  async start() {
    try {
      await initializeRedis();
      await prisma.$connect();
      await this.tgChecker.initialize();
      
      this.isRunning = true;
      logger.info('Telegram worker started', { consumerName: this.consumerName });

      // Start processing streams
      await this.processTgChecks();

    } catch (error) {
      logger.error({ err: error }, 'Failed to start Telegram worker');
      process.exit(1);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.tgChecker.disconnect();
    await this.redis.disconnect();
    await prisma.$disconnect();
    logger.info('Telegram worker stopped');
  }

  private async processTgChecks() {
    while (this.isRunning) {
      try {
        const messages = await this.redis.readFromStream(
          REDIS_STREAMS.TG_CHECKS,
          REDIS_CONSUMER_GROUPS.TG_WORKER,
          this.consumerName,
          5, // Lower batch size for TG due to rate limits
          1000
        );

        for (const [stream, streamMessages] of messages) {
          for (const [messageId, fields] of streamMessages) {
            await this.processTgCheck(messageId, fields);
            await this.redis.acknowledgeMessage(stream, REDIS_CONSUMER_GROUPS.TG_WORKER, messageId);
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error processing Telegram checks');
        await sleep(1000);
      }
    }
  }

  private async processTgCheck(messageId: string, fields: Record<string, string>) {
    const { jobId, e164, idempotencyKey } = fields;

    try {
      // Check cache first
      const cached = await this.redis.get(`tg_cache:${e164}`);
      if (cached) {
        const cacheData = JSON.parse(cached);
        await this.updateJobItem(jobId, e164, {
          tgStatus: cacheData.status,
          tgCheckedAt: new Date(cacheData.checkedAt),
        });
        return;
      }

      // Check with Telegram
      const result = await this.tgChecker.checkNumber(e164);
      
      // Cache and update result
      await this.cacheResult(e164, result);
      await this.updateJobItem(jobId, e164, {
        tgStatus: result.status,
        tgCheckedAt: new Date(),
      });

    } catch (error) {
      logger.error({ err: error, jobId, e164 }, 'Error processing Telegram check');
      await this.updateJobItem(jobId, e164, {
        tgStatus: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async updateJobItem(jobId: string, e164: string, data: any) {
    await prisma.jobItem.updateMany({
      where: { jobId, e164 },
      data,
    });

    // Send progress update
    await this.redis.addToStream(REDIS_STREAMS.BULK_PROGRESS, {
      jobId,
      type: 'tg_update',
      e164,
      status: data.tgStatus || 'unknown',
    });
  }

  private async cacheResult(e164: string, result: any) {
    const ttl = 7 * 24 * 60 * 60; // 7 days
    await this.redis.set(
      `tg_cache:${e164}`,
      JSON.stringify({
        status: result.status,
        checkedAt: new Date().toISOString(),
        meta: result.meta || {},
      }),
      ttl
    );

    // Also update database cache
    await prisma.tgCache.upsert({
      where: { e164 },
      update: {
        status: result.status,
        checkedAt: new Date(),
        ttlAt: new Date(Date.now() + ttl * 1000),
        meta: result.meta || {},
      },
      create: {
        e164,
        status: result.status,
        checkedAt: new Date(),
        ttlAt: new Date(Date.now() + ttl * 1000),
        meta: result.meta || {},
      },
    });
  }
}

// Start worker
const worker = new TelegramWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down Telegram worker');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down Telegram worker');
  await worker.stop();
  process.exit(0);
});

worker.start().catch((error) => {
  logger.error({ err: error }, 'Telegram worker crashed');
  process.exit(1);
});
