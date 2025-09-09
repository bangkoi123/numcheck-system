import { FastifyInstance } from 'fastify';
import { bulkCheckSchema, generateJobId, getRedisClient, REDIS_STREAMS } from '@numcheck/shared';
import { prisma } from '@numcheck/database';
import { normalizeAndDeduplicateNumbers } from '@numcheck/shared';

export async function bulkRoutes(server: FastifyInstance) {
  const redis = getRedisClient();

  // Start bulk job
  server.post('/start', {
    schema: {
      tags: ['Bulk Operations'],
      summary: 'Start bulk number validation job',
      body: bulkCheckSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { numbers, platforms, countryDefault } = request.body;
    const jobId = generateJobId();

    // Normalize and deduplicate numbers
    const { normalized, invalid, duplicatesCount } = normalizeAndDeduplicateNumbers(numbers, countryDefault);

    // Create job in database
    const job = await prisma.job.create({
      data: {
        id: jobId,
        tenantId: 'default-tenant', // TODO: Get from auth
        createdById: 'default-user', // TODO: Get from auth
        type: 'BULK',
        total: normalized.length,
        countryDefault,
        platforms: JSON.stringify(platforms),
        duplicatesCount,
        status: 'PENDING',
      },
    });

    // Create job items
    await prisma.jobItem.createMany({
      data: normalized.map((number) => ({
        jobId,
        e164: number,
      })),
    });

    // Send to Redis stream for processing
    await redis.addToStream(REDIS_STREAMS.BULK_ITEMS, {
      jobId,
      platforms: JSON.stringify(platforms),
      total: normalized.length.toString(),
    });

    return { jobId };
  });

  // Get job status
  server.get('/status', {
    schema: {
      tags: ['Bulk Operations'],
      summary: 'Get bulk job status',
      querystring: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            status: { type: 'string' },
            processed: { type: 'number' },
            total: { type: 'number' },
            progress: { type: 'number' },
            summary: { type: 'object' },
            duplicatesCount: { type: 'number' },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { jobId } = request.query as { jobId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    const progress = job.total > 0 ? job.processed / job.total : 0;

    return {
      jobId: job.id,
      status: job.status.toLowerCase(),
      processed: job.processed,
      total: job.total,
      progress: Math.round(progress * 100) / 100,
      summary: job.summary,
      duplicatesCount: job.duplicatesCount,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  });

  // SSE stream for job progress
  server.get('/stream', {
    schema: {
      tags: ['Bulk Operations'],
      summary: 'Stream bulk job progress via SSE',
      querystring: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { jobId } = request.query as { jobId: string };

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial status
    const progress = job.total > 0 ? job.processed / job.total : 0;
    reply.raw.write(`data: ${JSON.stringify({
      jobId: job.id,
      status: job.status.toLowerCase(),
      processed: job.processed,
      total: job.total,
      progress: Math.round(progress * 100) / 100,
      summary: job.summary,
    })}\n\n`);

    // If job is completed, close connection
    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELED') {
      reply.raw.end();
      return;
    }

    // Poll for updates every 2 seconds
    const interval = setInterval(async () => {
      try {
        const updatedJob = await prisma.job.findUnique({
          where: { id: jobId },
        });

        if (!updatedJob) {
          reply.raw.end();
          clearInterval(interval);
          return;
        }

        const progress = updatedJob.total > 0 ? updatedJob.processed / updatedJob.total : 0;
        reply.raw.write(`data: ${JSON.stringify({
          jobId: updatedJob.id,
          status: updatedJob.status.toLowerCase(),
          processed: updatedJob.processed,
          total: updatedJob.total,
          progress: Math.round(progress * 100) / 100,
          summary: updatedJob.summary,
        })}\n\n`);

        // Close connection if job is done
        if (updatedJob.status === 'COMPLETED' || updatedJob.status === 'FAILED' || updatedJob.status === 'CANCELED') {
          reply.raw.end();
          clearInterval(interval);
        }
      } catch (error) {
        reply.raw.end();
        clearInterval(interval);
      }
    }, 2000);

    // Clean up on client disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  // Export job results
  server.get('/export.csv', {
    schema: {
      tags: ['Bulk Operations'],
      summary: 'Export bulk job results as CSV',
      querystring: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { jobId } = request.query as { jobId: string };

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { items: true },
    });

    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }

    if (job.status !== 'COMPLETED') {
      return reply.code(400).send({ error: 'Job not completed yet' });
    }

    // Generate CSV content
    const csvHeader = 'e164,wa_status,tg_status,wa_checked_at,tg_checked_at,error\n';
    const csvRows = job.items.map(item => 
      `${item.e164},${item.waStatus || ''},${item.tgStatus || ''},${item.waCheckedAt || ''},${item.tgCheckedAt || ''},${item.error || ''}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="numcheck-${jobId}.csv"`);
    
    return csvContent;
  });
}
