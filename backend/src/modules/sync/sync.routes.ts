import type { FastifyInstance } from 'fastify';
import { syncPullQuerySchema, syncPushSchema } from './sync.schema.js';
import { pullSync, pushSync } from './sync.service.js';

export async function syncRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['sync'],
        summary: 'Enviar lote offline (UC07). Idempotente, LWW, falha parcial {synced, failed}.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request) => {
      const input = syncPushSchema.parse(request.body);
      return pushSync(app, request.user.sub, input);
    },
  );

  app.get(
    '/pull',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['sync'],
        summary: 'Puxar mudanças do servidor desde ?since=<ISO>.',
        security: [{ bearerAuth: [] }],
        querystring: { type: 'object', properties: { since: { type: 'string' } } },
      },
    },
    async (request) => {
      const { since } = syncPullQuerySchema.parse(request.query);
      return pullSync(app, since);
    },
  );
}
