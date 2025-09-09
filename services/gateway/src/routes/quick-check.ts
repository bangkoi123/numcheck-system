import { FastifyInstance } from 'fastify';
import { quickCheckSchema } from '@numcheck/shared';
import { prisma } from '@numcheck/database';
import { normalizeAndDeduplicateNumbers } from '@numcheck/shared';

export async function quickCheckRoutes(server: FastifyInstance) {
  server.post('/quick-check', {
    schema: {
      tags: ['Validation'],
      summary: 'Quick check for WhatsApp and Telegram numbers',
      body: quickCheckSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  e164: { type: 'string' },
                  waStatus: { type: 'string' },
                  tgStatus: { type: 'string' },
                  error: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                wa: {
                  type: 'object',
                  properties: {
                    registered: { type: 'number' },
                    not_registered: { type: 'number' },
                    business_active: { type: 'number' },
                    unknown: { type: 'number' },
                  },
                },
                tg: {
                  type: 'object',
                  properties: {
                    registered: { type: 'number' },
                    not_registered: { type: 'number' },
                    unknown: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { numbers, platforms, countryDefault } = request.body;

    // Normalize and deduplicate numbers
    const { normalized, invalid, duplicatesCount } = normalizeAndDeduplicateNumbers(numbers, countryDefault);

    // Process each number (mocked for now)
    const results = normalized.map((number) => {
      // Mock validation logic
      return {
        e164: number,
        waStatus: 'unknown',
        tgStatus: 'unknown',
        error: null,
      };
    });

    // Prepare summary
    const summary = {
      wa: {
        registered: results.filter(r => r.waStatus === 'registered').length,
        not_registered: results.filter(r => r.waStatus === 'not_registered').length,
        business_active: results.filter(r => r.waStatus === 'business_active').length,
        unknown: results.filter(r => r.waStatus === 'unknown').length,
      },
      tg: {
        registered: results.filter(r => r.tgStatus === 'registered').length,
        not_registered: results.filter(r => r.tgStatus === 'not_registered').length,
        unknown: results.filter(r => r.tgStatus === 'unknown').length,
      },
    };

    return {
      items: results,
      summary,
      duplicatesCount,
      invalid,
    };
  });
}
