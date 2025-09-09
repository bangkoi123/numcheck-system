import 'dotenv/config';
import { 
  getRedisClient, 
  initializeRedis, 
  logger, 
  REDIS_STREAMS, 
  REDIS_CONSUMER_GROUPS,
  exponentialBackoff,
  sleep
} from '@numcheck/shared';
import { prisma } from '@numcheck/database';
import { WhatsAppChecker } from './wa-checker';

class WhatsAppWorker {
  private redis = getRedisClient();
  private waChecker = new WhatsAppChecker();
  private isRunning = false;
  private consumerName = `wa-worker-${process.pid}`;

  async start() {
    try {
      await initializeRedis();
      await prisma.$connect();
      
      this.isRunning = true;
      logger.info('WhatsApp worker started', { consumerName: this.consumerName });

      // Start processing streams
      await Promise.all([
        this.processBulkItems(),
        this.processStage2Items(),
      ]);

    } catch (error) {
      logger.error({ err: error }, 'Failed to start WhatsApp worker');
      process.exit(1);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.redis.disconnect();
    await prisma.$disconnect();
    logger.info('WhatsApp worker stopped');
  }

  private async processBulkItems() {
    while (this.isRunning) {
      try {
        const messages = await this.redis.readFromStream(
          REDIS_STREAMS.BULK_ITEMS,
          REDIS_CONSUMER_GROUPS.WA_WORKER,
          this.consumerName,
          10,
          1000
        );

        for (const [stream, streamMessages] of messages) {
          for (const [messageId, fields] of streamMessages) {
            await this.processBulkItem(messageId, fields);
            await this.redis.acknowledgeMessage(stream, REDIS_CONSUMER_GROUPS.WA_WORKER, messageId);
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error processing bulk items');
        await sleep(1000);
      }
    }
  }

  private async processStage2Items() {
    while (this.isRunning) {
      try {
        const messages = await this.redis.readFromStream(
          REDIS_STREAMS.WA_STAGE2,
          REDIS_CONSUMER_GROUPS.WA_WORKER,
          this.consumerName,
          5,
          1000
        );

        for (const [stream, streamMessages] of messages) {
          for (const [messageId, fields] of streamMessages) {
            await this.processStage2Item(messageId, fields);
            await this.redis.acknowledgeMessage(stream, REDIS_CONSUMER_GROUPS.WA_WORKER, messageId);
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error processing stage 2 items');
        await sleep(1000);
      }
    }
  }

  private async processBulkItem(messageId: string, fields: Record<string, string>) {
    const { jobId, e164, platforms, idempotencyKey } = fields;

    if (!platforms.includes('whatsapp')) {
      return; // Skip if WhatsApp not requested
    }

    try {
      // Check cache first
      const cached = await this.redis.get(`wa_cache:${e164}`);
      if (cached) {
        const cacheData = JSON.parse(cached);
        await this.updateJobItem(jobId, e164, {
          waStatus: cacheData.status,
          waCheckedAt: new Date(cacheData.checkedAt),
        });
        return;
      }

      // Stage 1: Free heuristic check
      if (process.env.USE_WA_STAGE1 === 'true') {
        const stage1Result = await this.waChecker.checkStage1(e164);
        
        if (stage1Result.status !== 'unknown') {
          // Cache and update result
          await this.cacheResult(e164, stage1Result);
          await this.updateJobItem(jobId, e164, {
            waStatus: stage1Result.status,
            waCheckedAt: new Date(),
          });
          return;
        }
      }

      // Stage 1 inconclusive, send to Stage 2 queue
      await this.redis.addToStream(REDIS_STREAMS.WA_STAGE2, {
        jobId,
        e164,
        idempotencyKey,
      });

    } catch (error) {
      logger.error({ err: error, jobId, e164 }, 'Error processing bulk item');
      await this.updateJobItem(jobId, e164, {
        waStatus: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processStage2Item(messageId: string, fields: Record<string, string>) {
    const { jobId, e164, idempotencyKey } = fields;

    try {
      // Stage 2: Paid API check
      const stage2Result = await this.waChecker.checkStage2(e164);
      
      // Cache and update result
      await this.cacheResult(e164, stage2Result);
      await this.updateJobItem(jobId, e164, {
        waStatus: stage2Result.status,
        waCheckedAt: new Date(),
      });

    } catch (error) {
      logger.error({ err: error, jobId, e164 }, 'Error processing stage 2 item');
      await this.updateJobItem(jobId, e164, {
        waStatus: 'unknown',
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
      type: 'wa_update',
      e164,
      status: data.waStatus || 'unknown',
    });
  }

  private async cacheResult(e164: string, result: any) {
    const ttl = 7 * 24 * 60 * 60; // 7 days
    await this.redis.set(
      `wa_cache:${e164}`,
      JSON.stringify({
        status: result.status,
        checkedAt: new Date().toISOString(),
        meta: result.meta || {},
      }),
      ttl
    );

    // Also update database cache
    await prisma.waCache.upsert({
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
const worker = new WhatsAppWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down WhatsApp worker');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down WhatsApp worker');
  await worker.stop();
  process.exit(0);
});

worker.start().catch((error) => {
  logger.error({ err: error }, 'WhatsApp worker crashed');
  process.exit(1);
});
