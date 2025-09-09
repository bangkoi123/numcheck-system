import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { quickCheckRoutes } from './quick-check';
import { bulkRoutes } from './bulk';
import { adminRoutes } from './admin';

export async function registerRoutes(server: FastifyInstance) {
  // API v1 routes
  await server.register(async function (server) {
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(quickCheckRoutes);
    await server.register(bulkRoutes, { prefix: '/bulk' });
  }, { prefix: '/api/v1' });

  // Admin routes
  await server.register(adminRoutes, { prefix: '/api/admin' });

  // Root endpoint
  server.get('/', async () => {
    return {
      name: 'NumCheck API',
      version: '1.0.0',
      description: 'Event-driven multi-tenant WhatsApp & Telegram number validation system',
      documentation: '/docs',
      health: '/healthz',
    };
  });
}
