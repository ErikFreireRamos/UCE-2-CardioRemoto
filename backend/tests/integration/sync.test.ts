import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { authHeader, createTestUser, loginAndGetToken, makeTestApp, resetDb } from './helpers.js';

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await makeTestApp();
});

beforeEach(async () => {
  await resetDb(app);
  await createTestUser(app);
  token = (await loginAndGetToken(app)).accessToken;
});

afterAll(async () => {
  await app?.close();
});

function patientRecord(id: string, updatedAt: string, overrides: Record<string, unknown> = {}) {
  return {
    entity: 'patient',
    id,
    updatedAt,
    data: {
      identifier: '111.444.777-35',
      socialName: 'Maria Offline',
      birthDate: '1968-03-12',
      biologicalSex: 'F',
      smokingStatus: 'ex_fumante',
      physicalActivity: 'raramente',
      usesStatin: true,
      cardiovascularHistory: 'nao',
      ...overrides,
    },
  };
}

function visitRecord(id: string, patientId: string, updatedAt: string) {
  return {
    entity: 'visit',
    id,
    updatedAt,
    data: { patientId, collectedAt: '2026-07-01T10:00:00Z', measurement: { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, ldl: 160 } },
  };
}

describe('POST /sync (UC07 / RNF001)', () => {
  it('corpo vazio → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: { deviceId: 'dev1', records: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('sincroniza paciente + visita e é idempotente no reenvio', async () => {
    const pid = randomUUID();
    const vid = randomUUID();
    const now = new Date().toISOString();
    // Visita ANTES do paciente no lote — deve ser resolvido pela ordenação.
    const batch = { deviceId: 'dev1', records: [visitRecord(vid, pid, now), patientRecord(pid, now)] };

    const first = await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: batch });
    expect(first.statusCode).toBe(200);
    expect(first.json().synced).toHaveLength(2);
    expect(first.json().failed).toHaveLength(0);

    // Reenvio do mesmo lote não duplica (idempotente).
    const second = await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: batch });
    expect(second.json().synced).toHaveLength(2);

    const patients = await app.prisma.patient.count();
    const visits = await app.prisma.visit.count();
    expect(patients).toBe(1);
    expect(visits).toBe(1);
  });

  it('falha parcial: registro inválido volta em failed sem abortar o lote nem perder o válido', async () => {
    const pid = randomUUID();
    const orphanVisit = randomUUID();
    const now = new Date().toISOString();
    const batch = {
      deviceId: 'dev1',
      records: [
        patientRecord(pid, now),
        // visita apontando para um paciente inexistente → falha isolada
        visitRecord(orphanVisit, randomUUID(), now),
      ],
    };
    const res = await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: batch });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.synced).toContain(pid);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].reason).toBe('patient_not_found');
  });

  it('last-write-wins: um updatedAt mais antigo não sobrescreve o registro mais novo', async () => {
    const pid = randomUUID();
    const recent = new Date().toISOString();
    await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: { deviceId: 'd', records: [patientRecord(pid, recent, { socialName: 'Nome Novo' })] } });

    const older = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: { deviceId: 'd', records: [patientRecord(pid, older, { socialName: 'Nome Antigo' })] } });

    const p = await app.prisma.patient.findUnique({ where: { id: pid } });
    expect(p?.socialName).toBe('Nome Novo');
  });

  it('GET /sync/pull?since= retorna apenas o alterado depois do timestamp', async () => {
    const pid = randomUUID();
    await app.inject({ method: 'POST', url: '/sync', headers: authHeader(token), payload: { deviceId: 'd', records: [patientRecord(pid, new Date().toISOString())] } });

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const empty = await app.inject({ method: 'GET', url: `/sync/pull?since=${future}`, headers: authHeader(token) });
    expect(empty.json().patients).toHaveLength(0);

    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const some = await app.inject({ method: 'GET', url: `/sync/pull?since=${past}`, headers: authHeader(token) });
    expect(some.json().patients.length).toBeGreaterThanOrEqual(1);
  });
});
