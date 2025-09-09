import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function setupSwagger(server: FastifyInstance) {
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'NumCheck API',
        description: 'Event-driven multi-tenant WhatsApp & Telegram number validation system',
        version: '1.0.0',
        contact: {
          name: 'NumCheck Support',
          email: 'support@numcheck.com',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-Api-Key',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
        {
          apiKeyAuth: [],
        },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
}
