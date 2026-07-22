import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { loadEnv } from '../config/env.js';

/** helmet + CORS configurável por env (permite a origem do frontend na rede local). */
export default fp(async (app: FastifyInstance) => {
  const env = loadEnv();

  await app.register(helmet, {
    // Não interferir no Swagger UI.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Permite ferramentas sem Origin (curl, health checks) e as origens configuradas.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
});
