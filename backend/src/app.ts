import Fastify, { type FastifyInstance } from 'fastify';
import prismaPlugin from './plugins/prisma.js';
import errorHandler from './plugins/errorHandler.js';
import securityPlugin from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import swaggerPlugin from './plugins/swagger.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { patientsRoutes } from './modules/patients/patients.routes.js';
import { visitsRoutes } from './modules/visits/visits.routes.js';
import { syncRoutes } from './modules/sync/sync.routes.js';

export interface BuildAppOptions {
  logger?: boolean;
}

/** Monta a instância Fastify com todos os plugins e rotas. */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    // O logger padrão do Fastify registra apenas metadados (método/URL), nunca corpos —
    // então senha e dados sensíveis do paciente não são logados.
  });

  await app.register(errorHandler);
  await app.register(prismaPlugin);
  await app.register(securityPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);
  await app.register(swaggerPlugin);

  app.get('/health', { schema: { tags: ['health'] as never } }, async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(patientsRoutes);
  await app.register(visitsRoutes);
  await app.register(syncRoutes, { prefix: '/sync' });

  await app.ready();
  return app;
}
