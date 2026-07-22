import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';

// Configura o ambiente de teste ANTES de qualquer import do app (loadEnv lê process.env).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://cardio:cardio@localhost:5432/cardioremoto_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOGIN_MAX_ATTEMPTS = '5';
process.env.LOGIN_LOCK_MINUTES = '15';
// Rate limit alto no teste para não gerar 429 ao repetir logins entre casos.
process.env.RATE_LIMIT_LOGIN_MAX = '10000';

const { buildApp } = await import('../../src/app.js');

export async function makeTestApp(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}

/** Limpa todas as tabelas (ordem segura de FK). */
export async function resetDb(app: FastifyInstance): Promise<void> {
  await app.prisma.syncLog.deleteMany();
  await app.prisma.refreshToken.deleteMany();
  await app.prisma.measurement.deleteMany();
  await app.prisma.visit.deleteMany();
  await app.prisma.patient.deleteMany();
  await app.prisma.user.deleteMany();
}

export async function createTestUser(app: FastifyInstance, login = 'sandra.lima', password = 'cardio123') {
  const passwordHash = await bcrypt.hash(password, 8);
  return app.prisma.user.create({ data: { login, name: 'Sandra Lima', passwordHash, teamId: 'Equipe 04' } });
}

export async function loginAndGetToken(app: FastifyInstance, login = 'sandra.lima', password = 'cardio123') {
  const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { login, password } });
  return res.json() as { accessToken: string; refreshToken: string };
}

export function authHeader(token: string) {
  return { authorization: `Bearer ${token}` };
}
