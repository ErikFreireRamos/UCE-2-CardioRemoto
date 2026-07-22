import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../../config/env.js';
import { loginSchema, refreshSchema, logoutSchema } from './auth.schema.js';
import { login, logout, refresh } from './auth.service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();

  app.post(
    '/login',
    {
      config: {
        // Rate limit estrito nesta rota (defesa contra brute force, além do bloqueio 5/15).
        rateLimit: { max: env.RATE_LIMIT_LOGIN_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 },
      },
      schema: {
        tags: ['auth'],
        summary: 'Login (UC01). Bloqueia após 5 tentativas por 15 minutos.',
        body: {
          type: 'object',
          required: ['login', 'password'],
          properties: { login: { type: 'string' }, password: { type: 'string' } },
        },
      },
    },
    async (request) => {
      const input = loginSchema.parse(request.body);
      return login(app, input);
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Rotaciona o refresh token e emite novo access token.',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      return refresh(app, refreshToken);
    },
  );

  app.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Revoga o refresh token (logout).',
        body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
      },
    },
    async (request, reply) => {
      const { refreshToken } = logoutSchema.parse(request.body);
      await logout(app, refreshToken);
      return reply.status(204).send();
    },
  );
}
