import 'dotenv/config';
import { 
  getRedisClient, 
  initializeRedis, 
  logger, 
  REDIS_STREAMS, 
  REDIS_CONSUMER_GROUPS,
  sleep,
  createSignedUrl
} from '@numcheck/shared';
import { prisma } from '@numcheck/database';
import { S3Exporter } from './s3-exporter';

class AggregatorService {
  private redis = getRedisClient();
  private s3Exporter = new S3Exporter();
  private isRunning = false;
  private consumerName = `aggregator-${process.pid}`;

  async start() {
    try {
      await initializeRedis();
      await prisma.$connect();
      await this.s3Exporter.initialize();
      
      this.isRunning = true;
      logger.info('Aggregator service started', { consumerName: this.consumerName });

      // Start processing streams
      await Promise.all([
        this.processBulkProgress(),
        this.processCompletedJobs(),
      ]);

    } catch (error) {
      logger.error({ err: error }, 'Failed to start aggregator service');
      process.exit(1);
    }
  }

  async stop() {
    this.isRunning = false;
    await this.redis.disconnect();
    await prisma.$disconnect();
    logger.info('Aggregator service stopped');
  }

  private async processBulkProgress() {
    while (this.isRunning) {
      try {
        const messages = await this.redis.readFromStream(
          REDIS_STREAMS.BULK_PROGRESS,
          REDIS_CONSUMER_GROUPS.AGGREGATOR,
          this.consumerName,
          10,
          1000
        );

        for (const [stream, streamMessages] of messages) {
          for (const [messageId, fields] of streamMessages) {
            await this.processProgressUpdate(messageId, fields);
            await this.redis.acknowledgeMessage(stream, REDIS_CONSUMER_GROUPS.AGGREGATOR, messageId);
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error processing bulk progress');
        await sleep(1000);
      }
    }
  }

  private async processCompletedJobs() {
    while (this.isRunning) {
      try {
        // Check for jobs that need completion processing
        const completedJobs = await prisma.job.findMany({
          where: {
            status: 'RUNNING',
            // Job is complete when all items have been processed
          },
          include: {
            _count: {
              select: {
                items: true,
              },
            },
          },
        });

        for (const job of completedJobs) {
          const processedCount = await prisma.jobItem.count({
            where: {
              jobId: job.id,
              OR: [
                { waStatus: { not: null } },
                { tgStatus: { not: null } },
              ],
            },
          });

          if (processedCount >= job.total) {
            await this.completeJob(job.id);
          }
        }

        await sleep(5000); // Check every 5 seconds
      } catch (error) {
        logger.error({ err: error }, 'Error processing completed jobs');
        await sleep(5000);
      }
    }
  }

  private async processProgressUpdate(messageId: string, fields: Record<string, string>) {
    const { jobId, type, e164, status } = fields;

    try {
      // Update job progress
      await this.updateJobProgress(jobId);
      
      logger.debug(`Progress update for job ${jobId}`, { type, e164, status });

    } catch (error) {
      logger.error({ err: error, jobId }, 'Error processing progress update');
    }
  }

  private async updateJobProgress(jobId: string) {
    try {
      // Get current job stats
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          items: {
            select: {
              waStatus: true,
              tgStatus: true,
              error: true,
            },
          },
        },
      });

      if (!job) {
        logger.warn(`Job ${jobId} not found`);
        return;
      }

      // Calculate progress and summary
      const processed = job.items.filter(item => 
        item.waStatus !== null || item.tgStatus !== null
      ).length;

      const success = job.items.filter(item => 
        (item.waStatus && item.waStatus !== 'unknown') ||
        (item.tgStatus && item.tgStatus !== 'unknown')
      ).length;

      const failed = job.items.filter(item => 
        item.error !== null
      ).length;

      // Calculate summary by platform
      const waSummary = {
        registered: job.items.filter(item => item.waStatus === 'registered').length,
        not_registered: job.items.filter(item => item.waStatus === 'not_registered').length,
        business_active: job.items.filter(item => item.waStatus === 'business_active').length,
        unknown: job.items.filter(item => item.waStatus === 'unknown').length,
      };

      const tgSummary = {
        registered: job.items.filter(item => item.tgStatus === 'registered').length,
        not_registered: job.items.filter(item => item.tgStatus === 'not_registered').length,
        unknown: job.items.filter(item => item.tgStatus === 'unknown').length,
      };

      const summary = {
        wa: waSummary,
        tg: tgSummary,
      };

      // Update job
      await prisma.job.update({
        where: { id: jobId },
        data: {
          processed,
          success,
          failed,
          summary: JSON.stringify(summary),
        },
      });

    } catch (error) {
      logger.error({ err: error, jobId }, 'Error updating job progress');
    }
  }

  private async completeJob(jobId: string) {
    try {
      logger.info(`Completing job ${jobId}`);

      // Update job status
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
        },
      });

      // Generate and upload export file
      await this.generateExport(jobId);

      logger.info(`Job ${jobId} completed successfully`);

    } catch (error) {
      logger.error({ err: error, jobId }, 'Error completing job');
      
      // Mark job as failed
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
        },
      });
    }
  }

  private async generateExport(jobId: string) {
    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          items: true,
        },
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Generate CSV content
      const csvData = job.items.map(item => ({
        e164: item.e164,
        wa_status: item.waStatus || '',
        tg_status: item.tgStatus || '',
        wa_checked_at: item.waCheckedAt?.toISOString() || '',
        tg_checked_at: item.tgCheckedAt?.toISOString() || '',
        error: item.error || '',
      }));

      // Upload to S3
      const s3Key = `exports/${jobId}.csv`;
      await this.s3Exporter.uploadCsv(s3Key, csvData);

      // Generate signed URL
      const signedUrl = createSignedUrl(
        process.env.S3_ENDPOINT || 'http://localhost:9000',
        `/${process.env.S3_BUCKET}/${s3Key}`,
        process.env.JWT_SECRET || 'change_me',
        24 * 60 * 60 // 24 hours
      );

      // Update job with export URL
      await prisma.job.update({
        where: { id: jobId },
        data: {
          exportUrl: signedUrl,
        },
      });

      logger.info(`Export generated for job ${jobId}`, { s3Key, signedUrl });

    } catch (error) {
      logger.error({ err: error, jobId }, 'Error generating export');
      throw error;
    }
  }
}

// Start service
const aggregator = new AggregatorService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down aggregator service');
  await aggregator.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down aggregator service');
  await aggregator.stop();
  process.exit(0);
});

aggregator.start().catch((error) => {
  logger.error({ err: error }, 'Aggregator service crashed');
  process.exit(1);
});
