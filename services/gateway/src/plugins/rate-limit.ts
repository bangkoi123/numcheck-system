import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { getRedisClient } from '@numcheck/shared';

export async function setupRateLimit(server: FastifyInstance) {
  const redis = getRedisClient();

  await server.register(rateLimit, {
    max: 100, // Default global rate limit
    timeWindow: '1 minute',
    redis: redis.getClient(),
    keyGenerator: (request: any) => {
      // Use tenant ID if available, otherwise IP
      if (request.tenant) {
        return `tenant:${request.tenant.id}`;
      }
      if (request.user) {
        return `user:${request.user.tenantId}`;
      }
      return request.ip;
    },
    errorResponseBuilder: (request: any, context: any) => {
      return {
        error: 'Rate limit exceeded',
        message: `Too many requests, limit is ${context.max} per ${context.timeWindow}`,
        retryAfter: context.ttl,
      };
    },
    onExceeding: (request: any, key: string) => {
      server.log.warn(`Rate limit exceeded for key: ${key}`);
    },
  });

  // Custom rate limiter for specific endpoints
  server.decorate('rateLimitTenant', function (maxRequests: number = 60) {
    return async (request: any, reply: any) => {
      const tenantId = request.tenant?.id || request.user?.tenantId;
      
      if (!tenantId) {
        return reply.code(401).send({ error: 'Authentication required for rate limiting' });
      }

      const key = `rate_limit:tenant:${tenantId}:${Math.floor(Date.now() / 60000)}`;
      const current = await redis.incrementRateLimit(key, 60);

      // Get tenant-specific rate limit
      const limit = request.tenant?.rateLimit || maxRequests;

      if (current > limit) {
        return reply.code(429).send({
          error: 'Rate limit exceeded',
          message: `Tenant rate limit of ${limit} requests per minute exceeded`,
          limit,
          remaining: 0,
          resetTime: Math.ceil(Date.now() / 60000) * 60000,
        });
      }

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', limit);
      reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
      reply.header('X-RateLimit-Reset', Math.ceil(Date.now() / 60000) * 60000);
    };
  });
}
