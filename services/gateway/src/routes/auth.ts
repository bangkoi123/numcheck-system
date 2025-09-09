import { FastifyInstance } from 'fastify';
import { prisma } from '@numcheck/database';
import { loginSchema } from '@numcheck/shared';
import { hashPassword, verifyPassword, generateJWT } from '../plugins/auth';

export async function authRoutes(server: FastifyInstance) {
  // Login endpoint
  server.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Login with email and password',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                tenantId: { type: 'string' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = generateJWT(server, {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  });

  // Get current user info
  server.get('/me', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Get current user information',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            tenantId: { type: 'string' },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                plan: { type: 'string' },
                rateLimit: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request: any) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { tenant: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
        rateLimit: user.tenant.rateLimit,
      },
    };
  });

  // Refresh token endpoint
  server.post('/refresh', {
    preHandler: [server.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Refresh JWT token',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
  }, async (request: any) => {
    const token = generateJWT(server, {
      id: request.user.id,
      email: request.user.email,
      role: request.user.role,
      tenantId: request.user.tenantId,
    });

    return { token };
  });
}
