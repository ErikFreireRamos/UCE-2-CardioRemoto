import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

/** Handler central: converte qualquer erro no formato { error: { code, message, details } }. */
export default fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    // Erros de validação Zod → 422 com os campos problemáticos.
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: { issues: error.issues.map((i) => ({ path: i.path, message: i.message })) },
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }

    // Rate limit do @fastify/rate-limit
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.' },
      });
    }

    // Validação de schema do próprio Fastify
    if ((error as { validation?: unknown }).validation) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: (error as Error).message },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${request.method} ${request.url}` },
    });
  });
});
