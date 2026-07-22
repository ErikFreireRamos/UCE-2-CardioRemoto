import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loadEnv } from '../../config/env.js';
import { LockedError, UnauthorizedError } from '../../lib/errors.js';
import { generateRefreshToken, hashToken, ttlToMs } from '../../lib/tokens.js';
import type { LoginInput } from './auth.schema.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; login: string; name: string };
}

function minutesRemaining(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000));
}

/**
 * Login (UC01). Fluxo alternativo: após LOGIN_MAX_ATTEMPTS tentativas inválidas consecutivas,
 * bloqueia o acesso por LOGIN_LOCK_MINUTES minutos, informando o tempo restante.
 */
export async function login(app: FastifyInstance, input: LoginInput): Promise<AuthTokens> {
  const env = loadEnv();
  const now = new Date();
  const user = await app.prisma.user.findUnique({ where: { login: input.login } });

  // Mensagem genérica de credenciais quando o usuário não existe (não revela existência).
  if (!user) {
    throw new UnauthorizedError('Login ou senha inválidos');
  }

  // Bloqueio ativo?
  if (user.lockedUntil && user.lockedUntil > now) {
    const mins = minutesRemaining(user.lockedUntil, now);
    throw new LockedError(
      `Acesso bloqueado por segurança. Tente novamente em ${mins} minuto(s).`,
      { lockedUntil: user.lockedUntil.toISOString(), minutesRemaining: mins },
    );
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60000);
      // Reinicia o contador e aplica o bloqueio.
      await app.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil },
      });
      throw new LockedError(
        `Acesso bloqueado após ${env.LOGIN_MAX_ATTEMPTS} tentativas. Tente novamente em ${env.LOGIN_LOCK_MINUTES} minutos.`,
        { lockedUntil: lockedUntil.toISOString(), minutesRemaining: env.LOGIN_LOCK_MINUTES },
      );
    }
    await app.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts } });
    throw new UnauthorizedError('Login ou senha inválidos', {
      attemptsRemaining: env.LOGIN_MAX_ATTEMPTS - attempts,
    });
  }

  // Sucesso → zera contadores e emite tokens.
  await app.prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  return issueTokens(app, { id: user.id, login: user.login, name: user.name });
}

async function issueTokens(
  app: FastifyInstance,
  user: { id: string; login: string; name: string },
): Promise<AuthTokens> {
  const env = loadEnv();
  const accessToken = app.jwt.sign({ sub: user.id, login: user.login, name: user.name });
  const { token, tokenHash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));
  await app.prisma.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  return { accessToken, refreshToken: token, user };
}

/** Rotação de refresh token: revoga o antigo e emite um novo par. */
export async function refresh(app: FastifyInstance, refreshToken: string): Promise<AuthTokens> {
  const now = new Date();
  const tokenHash = hashToken(refreshToken);
  const stored = await app.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!stored || stored.revokedAt || stored.expiresAt <= now) {
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }
  await app.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now } });
  return issueTokens(app, { id: stored.user.id, login: stored.user.login, name: stored.user.name });
}

/** Logout: revoga o refresh token (idempotente). */
export async function logout(app: FastifyInstance, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await app.prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
