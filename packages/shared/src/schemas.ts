import { z } from 'zod';

export const phoneNumberSchema = z.string().min(1).max(20);

export const platformSchema = z.enum(['whatsapp', 'telegram']);

export const countryCodeSchema = z.string().length(2).optional();

export const quickCheckSchema = z.object({
  numbers: z.array(phoneNumberSchema).min(1).max(100),
  platforms: z.array(platformSchema).min(1),
  countryDefault: countryCodeSchema,
});

export const bulkCheckSchema = z.object({
  numbers: z.array(phoneNumberSchema).min(1).max(1000000),
  platforms: z.array(platformSchema).min(1),
  countryDefault: countryCodeSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'TENANT_ADMIN', 'USER']).default('USER'),
  tenantId: z.string(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100),
  plan: z.string().default('basic'),
  rateLimit: z.number().int().min(1).max(10000).default(60),
});

export const createTgAccountSchema = z.object({
  phoneLabel: z.string().min(1),
  apiId: z.string().min(1),
  apiHash: z.string().min(1),
  sessionString: z.string().min(1),
  proxyUrl: z.string().url().optional(),
  dailyLimit: z.number().int().min(1).max(10000).default(1000),
});

export const updateTgAccountSchema = z.object({
  phoneLabel: z.string().min(1).optional(),
  proxyUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  dailyLimit: z.number().int().min(1).max(10000).optional(),
});
