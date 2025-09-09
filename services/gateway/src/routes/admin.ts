import { FastifyInstance } from 'fastify';
import { prisma } from '@numcheck/database';
import { createTenantSchema, createUserSchema, createTgAccountSchema } from '@numcheck/shared';
import { hashPassword } from '../plugins/auth';

export async function adminRoutes(server: FastifyInstance) {
  // Admin authentication middleware
  server.addHook('preHandler', server.authenticate);
  server.addHook('preHandler', server.requireAdmin);

  // Tenants management
  server.get('/tenants', {
    schema: {
      tags: ['Admin'],
      summary: 'List all tenants',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    return prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            jobs: true,
          },
        },
      },
    });
  });

  server.post('/tenants', {
    schema: {
      tags: ['Admin'],
      summary: 'Create new tenant',
      body: createTenantSchema,
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const data = createTenantSchema.parse(request.body);
    
    return prisma.tenant.create({
      data,
    });
  });

  // Users management
  server.get('/users', {
    schema: {
      tags: ['Admin'],
      summary: 'List all users',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    return prisma.user.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  server.post('/users', {
    schema: {
      tags: ['Admin'],
      summary: 'Create new user',
      body: createUserSchema,
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { password, ...data } = createUserSchema.parse(request.body);
    const passwordHash = await hashPassword(password);
    
    return prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  // Telegram accounts management
  server.get('/tg-accounts', {
    schema: {
      tags: ['Admin'],
      summary: 'List all Telegram accounts',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    return prisma.tgAccount.findMany({
      select: {
        id: true,
        phoneLabel: true,
        isActive: true,
        dailyLimit: true,
        lastUsedAt: true,
        errorCount: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose sensitive data
      },
    });
  });

  server.post('/tg-accounts', {
    schema: {
      tags: ['Admin'],
      summary: 'Add new Telegram account',
      body: createTgAccountSchema,
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const data = createTgAccountSchema.parse(request.body);
    
    // TODO: Encrypt session string before storing
    return prisma.tgAccount.create({
      data,
      select: {
        id: true,
        phoneLabel: true,
        isActive: true,
        dailyLimit: true,
        createdAt: true,
        // Don't expose sensitive data
      },
    });
  });

  server.put('/tg-accounts/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Update Telegram account',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    
    return prisma.tgAccount.update({
      where: { id },
      data,
      select: {
        id: true,
        phoneLabel: true,
        isActive: true,
        dailyLimit: true,
        updatedAt: true,
      },
    });
  });

  // Jobs management
  server.get('/jobs', {
    schema: {
      tags: ['Admin'],
      summary: 'List all jobs',
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          tenantId: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }, async (request) => {
    const { status, tenantId, limit = 50, offset = 0 } = request.query as any;
    
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (tenantId) where.tenantId = tenantId;
    
    return prisma.job.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  });

  server.get('/jobs/:id', {
    schema: {
      tags: ['Admin'],
      summary: 'Get job details',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
          take: 100, // Limit items for performance
        },
      },
    });
    
    if (!job) {
      return reply.code(404).send({ error: 'Job not found' });
    }
    
    return job;
  });

  // System stats
  server.get('/stats', {
    schema: {
      tags: ['Admin'],
      summary: 'Get system statistics',
      security: [{ bearerAuth: [] }],
    },
  }, async () => {
    const [
      totalTenants,
      totalUsers,
      totalJobs,
      activeJobs,
      totalTgAccounts,
      activeTgAccounts,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.job.count(),
      prisma.job.count({ where: { status: 'RUNNING' } }),
      prisma.tgAccount.count(),
      prisma.tgAccount.count({ where: { isActive: true } }),
    ]);

    return {
      tenants: {
        total: totalTenants,
      },
      users: {
        total: totalUsers,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
      },
      tgAccounts: {
        total: totalTgAccounts,
        active: activeTgAccounts,
      },
    };
  });
}
