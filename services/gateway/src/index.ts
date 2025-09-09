import 'dotenv/config';
import { fastify } from 'fastify';
import { logger } from '@numcheck/shared';
import { setupSwagger } from './plugins/swagger';
import { setupAuth } from './plugins/auth';
import { setupCors } from './plugins/cors';
import { setupRateLimit } from './plugins/rate-limit';
import { registerRoutes } from './routes';
import { initializeRedis } from '@numcheck/shared';
import { prisma } from '@numcheck/database';

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function start() {
  try {
    // Initialize Redis connection
    await initializeRedis();
    
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to database');

    // Register plugins
    await setupCors(server);
    await setupAuth(server);
    await setupRateLimit(server);
    await setupSwagger(server);

    // Register routes
    await registerRoutes(server);

    // Health check endpoint
    server.get('/healthz', async () => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      };
    });

    // Start server
    const port = parseInt(process.env.GATEWAY_PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`🚀 Gateway server running on http://${host}:${port}`);
    logger.info(`📚 API Documentation: http://${host}:${port}/docs`);

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();
