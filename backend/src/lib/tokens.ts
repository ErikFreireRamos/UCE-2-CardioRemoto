import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh tokens opacos: geramos um token aleatório, entregamos o valor cru ao cliente e
 * guardamos apenas o hash (sha256) no banco — permitindo rotação e revogação (logout).
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Converte "15m" / "7d" / "3600" em milissegundos. */
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(ttl.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  const factor = unit === 'd' ? 86400 : unit === 'h' ? 3600 : unit === 'm' ? 60 : 1;
  return value * factor * 1000;
}
