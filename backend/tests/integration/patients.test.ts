import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { authHeader, createTestUser, loginAndGetToken, makeTestApp, resetDb } from './helpers.js';

let app: FastifyInstance;
let token: string;

const basePatient = {
  identifier: '111.444.777-35',
  socialName: 'Maria Teste',
  birthDate: '1968-03-12',
  biologicalSex: 'F',
  smokingStatus: 'ex_fumante',
  physicalActivity: 'raramente',
  usesStatin: true,
  cardiovascularHistory: 'nao',
};

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

describe('Pacientes (UC02/03/04)', () => {
  it('cadastra paciente (201) com risco inicial sem_dados', async () => {
    const res = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: basePatient });
    expect(res.statusCode).toBe(201);
    expect(res.json().riskLevel).toBe('sem_dados');
  });

  it('CPF duplicado → 409 com referência ao cadastro existente', async () => {
    await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: basePatient });
    const dup = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: { ...basePatient, socialName: 'Outro' } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error.details.existingPatientId).toBeTruthy();
  });

  it('CPF inválido → 422', async () => {
    const res = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: { ...basePatient, identifier: '123.456.789-00' } });
    expect(res.statusCode).toBe(422);
  });

  it('exige data do evento CV quando histórico é aterosclerótico (decisão #4)', async () => {
    const semData = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: { ...basePatient, cardiovascularHistory: 'IAM' } });
    expect(semData.statusCode).toBe(422);
    const comData = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: { ...basePatient, cardiovascularHistory: 'IAM', cardiovascularEventAt: '2026-05-01' } });
    expect(comData.statusCode).toBe(201);
  });

  it('exige autenticação (401 sem token)', async () => {
    const res = await app.inject({ method: 'GET', url: '/patients' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Visitas (UC05/06)', () => {
  async function createPatient() {
    const res = await app.inject({ method: 'POST', url: '/patients', headers: authHeader(token), payload: basePatient });
    return res.json().id as string;
  }

  it('visita vazia → 422 "ao menos um campo"', async () => {
    const id = await createPatient();
    const res = await app.inject({ method: 'POST', url: `/patients/${id}/visits`, headers: authHeader(token), payload: { measurement: {} } });
    expect(res.statusCode).toBe(422);
  });

  it('calcula IMC no servidor e ignora o bmi enviado', async () => {
    const id = await createPatient();
    const res = await app.inject({
      method: 'POST',
      url: `/patients/${id}/visits`,
      headers: authHeader(token),
      payload: { measurement: { weight: 70, height: 175, bmi: 999 } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().visit.measurement.bmi).toBe(22.9);
  });

  it('gera alerta vermelho de PA e recalcula risco, sem bloquear o salvamento', async () => {
    const id = await createPatient();
    const res = await app.inject({
      method: 'POST',
      url: `/patients/${id}/visits`,
      headers: authHeader(token),
      payload: { measurement: { bloodPressureSystolic: 185, bloodPressureDiastolic: 122, ldl: 200, hba1c: 8 } },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.alerts.some((a: { field: string }) => a.field === 'bloodPressure')).toBe(true);
    expect(body.riskLevel).toBe('vermelho'); // 3 fora da meta
  });

  it('evolução retorna série com meta e unidade por métrica', async () => {
    const id = await createPatient();
    await app.inject({ method: 'POST', url: `/patients/${id}/visits`, headers: authHeader(token), payload: { collectedAt: '2026-01-10', measurement: { ldl: 180 } } });
    await app.inject({ method: 'POST', url: `/patients/${id}/visits`, headers: authHeader(token), payload: { collectedAt: '2026-03-10', measurement: { ldl: 150 } } });
    const res = await app.inject({ method: 'GET', url: `/patients/${id}/evolution?metrics=ldl`, headers: authHeader(token) });
    const ldl = res.json().metrics.find((m: { metric: string }) => m.metric === 'ldl');
    expect(ldl.unit).toBe('mg/dL');
    expect(ldl.goal).toBe(130);
    expect(ldl.points).toHaveLength(2);
  });
});
