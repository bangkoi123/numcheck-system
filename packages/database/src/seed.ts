import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'Default Tenant',
      plan: 'enterprise',
      rateLimit: 1000,
      apiKeyHash: await bcrypt.hash('default-api-key', 10),
    },
  });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@numcheck.com' },
    update: {},
    create: {
      email: 'admin@numcheck.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: UserRole.ADMIN,
      tenantId: defaultTenant.id,
    },
  });

  // Create demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: {
      id: 'demo-tenant',
      name: 'Demo Tenant',
      plan: 'basic',
      rateLimit: 60,
      apiKeyHash: await bcrypt.hash('demo-api-key', 10),
    },
  });

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: await bcrypt.hash('demo123', 10),
      role: UserRole.USER,
      tenantId: demoTenant.id,
    },
  });

  // Create sample Telegram account (inactive by default)
  await prisma.tgAccount.upsert({
    where: { id: 'sample-tg-account' },
    update: {},
    create: {
      id: 'sample-tg-account',
      phoneLabel: '+1234567890',
      apiId: '12345',
      apiHash: 'sample_api_hash',
      sessionString: 'encrypted_session_string_here',
      isActive: false,
      dailyLimit: 1000,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Admin: admin@numcheck.com / admin123');
  console.log('📧 Demo: demo@example.com / demo123');
  console.log('🔑 Default API Key: default-api-key');
  console.log('🔑 Demo API Key: demo-api-key');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
