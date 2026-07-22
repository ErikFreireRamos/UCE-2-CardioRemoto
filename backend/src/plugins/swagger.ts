import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/** OpenAPI/Swagger servido em /docs. */
export default fp(async (app: FastifyInstance) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'CardioRemoto API',
        description:
          'API central + sincronização do CardioRemoto (ecossistema mare.IA). ' +
          'Monitoramento de pacientes cardiovasculares por Agentes de Saúde, offline-first.',
        version: '1.0.0',
      },
      tags: [
        { name: 'auth', description: 'Autenticação (UC01)' },
        { name: 'patients', description: 'Pacientes (UC02/03/04)' },
        { name: 'visits', description: 'Visitas e evolução (UC05/06)' },
        { name: 'sync', description: 'Sincronização offline (UC07)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
});
