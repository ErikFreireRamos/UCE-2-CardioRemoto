import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos endpoints de rede (não há backend no ambiente de teste).
vi.mock('../src/api/endpoints', () => ({
  syncPush: vi.fn(),
  syncPull: vi.fn(async () => ({ serverTime: new Date().toISOString(), patients: [], visits: [] })),
}));

import { db } from '../src/data/db';
import { putLocalVisit, putLocalPatient, pendingCount } from '../src/data/repo';
import { runSync } from '../src/features/sync/syncEngine';
import { syncPush } from '../src/api/endpoints';

const mockedPush = vi.mocked(syncPush);

beforeEach(async () => {
  await db.patients.clear();
  await db.visits.clear();
  await db.outbox.clear();
  await db.syncMeta.clear();
  mockedPush.mockReset();
});

describe('camada offline / sync', () => {
  it('escrita grava a visita e o item do outbox atomicamente (offline-first)', async () => {
    const p = await putLocalPatient({
      identifier: '11144477735', socialName: 'Teste', birthDate: '1980-01-01T00:00:00Z',
      biologicalSex: 'F', smokingStatus: 'nao_fumante', physicalActivity: 'raramente', usesStatin: false, cardiovascularHistory: 'nao', cardiovascularEventAt: null,
    });
    const v = await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    expect((await db.visits.get(v.id))?.syncState).toBe('pending');
    expect(await db.outbox.count()).toBe(2); // paciente + visita
    expect(await pendingCount()).toBe(2);
  });

  it('sincroniza: marca synced e esvazia o outbox quando tudo é aceito', async () => {
    const p = await putLocalPatient({
      identifier: '11144477735', socialName: 'Teste', birthDate: '1980-01-01T00:00:00Z',
      biologicalSex: 'F', smokingStatus: 'nao_fumante', physicalActivity: 'raramente', usesStatin: false, cardiovascularHistory: 'nao', cardiovascularEventAt: null,
    });
    const v = await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    mockedPush.mockResolvedValueOnce({ syncedAt: new Date().toISOString(), synced: [p.id, v.id], failed: [] });

    const res = await runSync();
    expect(res).toEqual({ synced: 2, failed: 0 });
    expect((await db.visits.get(v.id))?.syncState).toBe('synced');
    expect(await db.outbox.count()).toBe(0);
    expect(await pendingCount()).toBe(0);
  });

  it('falha parcial: mantém o registro que falhou como pending/failed no outbox (nunca perde dados)', async () => {
    const p = await putLocalPatient({
      identifier: '11144477735', socialName: 'Teste', birthDate: '1980-01-01T00:00:00Z',
      biologicalSex: 'F', smokingStatus: 'nao_fumante', physicalActivity: 'raramente', usesStatin: false, cardiovascularHistory: 'nao', cardiovascularEventAt: null,
    });
    const v = await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    mockedPush.mockResolvedValueOnce({ syncedAt: new Date().toISOString(), synced: [p.id], failed: [{ id: v.id, reason: 'patient_not_found' }] });

    const res = await runSync();
    expect(res.failed).toBe(1);
    expect((await db.patients.get(p.id))?.syncState).toBe('synced');
    expect((await db.visits.get(v.id))?.syncState).toBe('failed');
    // O item que falhou continua no outbox para nova tentativa.
    expect(await db.outbox.get(v.id)).toBeTruthy();
    expect(await db.outbox.get(p.id)).toBeFalsy();
  });
});
