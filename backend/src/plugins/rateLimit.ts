import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { loadEnv } from '../config/env.js';

/**
 * Rate limit global (folgado) — o foco de segurança é a rota /auth/login, que aplica um limite
 * mais estrito via `config.rateLimit` na própria rota (ver auth.routes.ts).
 */
export default fp(async (app: FastifyInstance) => {
  const env = loadEnv();
  await app.register(rateLimit, {
    global: false,
    max: env.RATE_LIMIT_LOGIN_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  });
});
