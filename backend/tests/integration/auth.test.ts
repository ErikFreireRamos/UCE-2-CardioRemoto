import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestUser, makeTestApp, resetDb } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await makeTestApp();
});

beforeEach(async () => {
  await resetDb(app);
  await createTestUser(app);
});

afterAll(async () => {
  await app?.close();
});

describe('POST /auth/login (UC01)', () => {
  it('autentica com credenciais válidas e retorna tokens', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'cardio123' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.login).toBe('sandra.lima');
  });

  it('rejeita senha inválida com 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'errada' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('bloqueia após 5 tentativas inválidas por 15 minutos (fluxo alternativo)', async () => {
    for (let i = 0; i < 4; i++) {
      const r = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'errada' } });
      expect(r.statusCode).toBe(401);
    }
    // 5ª tentativa dispara o bloqueio (423 Locked).
    const fifth = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'errada' } });
    expect(fifth.statusCode).toBe(423);
    expect(fifth.json().error.details.minutesRemaining).toBe(15);

    // Mesmo com a senha CORRETA, segue bloqueado.
    const locked = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'cardio123' } });
    expect(locked.statusCode).toBe(423);
  });

  it('refresh rotaciona o token e logout o revoga', async () => {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { login: 'sandra.lima', password: 'cardio123' } });
    const { refreshToken } = login.json();

    const refreshed = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    const newRefresh = refreshed.json().refreshToken;

    // O token antigo foi revogado (rotação).
    const reuseOld = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(reuseOld.statusCode).toBe(401);

    // Logout revoga o novo.
    const out = await app.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: newRefresh } });
    expect(out.statusCode).toBe(204);
    const afterLogout = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: newRefresh } });
    expect(afterLogout.statusCode).toBe(401);
  });
});
