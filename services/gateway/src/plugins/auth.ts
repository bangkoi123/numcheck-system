import { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { prisma } from '@numcheck/database';
import { hashApiKey } from '@numcheck/shared';

export async function setupAuth(server: FastifyInstance) {
  // Register JWT plugin
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'change_me_in_production',
    sign: {
      expiresIn: '24h',
    },
  });

  // JWT authentication decorator
  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // API Key authentication decorator
  server.decorate('authenticateApiKey', async function (request: any, reply: any) {
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      return reply.code(401).send({ error: 'API key required' });
    }

    const pepper = process.env.API_KEY_PEPPER || 'change_me_in_production';
    const hashedKey = hashApiKey(apiKey as string, pepper);

    const tenant = await prisma.tenant.findFirst({
      where: {
        apiKeyHash: hashedKey,
        isActive: true,
      },
    });

    if (!tenant) {
      return reply.code(401).send({ error: 'Invalid API key' });
    }

    // Add tenant info to request
    request.tenant = {
      id: tenant.id,
      name: tenant.name,
      rateLimit: tenant.rateLimit,
    };
  });

  // Combined auth decorator (JWT or API Key)
  server.decorate('authenticateAny', async function (request: any, reply: any) {
    const apiKey = request.headers['x-api-key'];
    const authHeader = request.headers.authorization;

    if (apiKey) {
      return server.authenticateApiKey(request, reply);
    } else if (authHeader?.startsWith('Bearer ')) {
      return server.authenticate(request, reply);
    } else {
      return reply.code(401).send({ error: 'Authentication required' });
    }
  });

  // Admin role check decorator
  server.decorate('requireAdmin', async function (request: any, reply: any) {
    if (!request.user || request.user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Admin access required' });
    }
  });
}

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateJWT(server: FastifyInstance, payload: any): string {
  return server.jwt.sign(payload);
}
