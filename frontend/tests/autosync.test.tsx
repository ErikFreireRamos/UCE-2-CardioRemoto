import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// Mock dos endpoints de rede (não há backend no ambiente de teste).
vi.mock('../src/api/endpoints', () => ({
  syncPush: vi.fn(async () => ({ syncedAt: new Date().toISOString(), synced: [] as string[], failed: [] as { id: string; reason: string }[] })),
  syncPull: vi.fn(async () => ({ serverTime: new Date().toISOString(), patients: [], visits: [] })),
}));

import { db } from '../src/data/db';
import { putLocalPatient, putLocalVisit } from '../src/data/repo';
import { AutoSync } from '../src/features/sync/AutoSync';
import { useAuth } from '../src/features/auth/useAuth';
import { syncPush } from '../src/api/endpoints';

const mockedPush = vi.mocked(syncPush);

async function novoPaciente() {
  return putLocalPatient({
    identifier: '11144477735', socialName: 'Teste', birthDate: '1980-01-01T00:00:00Z',
    biologicalSex: 'F', smokingStatus: 'nao_fumante', physicalActivity: 'raramente',
    usesStatin: false, cardiovascularHistory: 'nao', cardiovascularEventAt: null,
  });
}

beforeEach(async () => {
  await db.patients.clear();
  await db.visits.clear();
  await db.outbox.clear();
  await db.syncMeta.clear();
  mockedPush.mockClear();
  useAuth.setState({ accessToken: 'token', refreshToken: 'r', user: { id: 'u1', login: 'sandra.lima', name: 'Sandra' } });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

describe('sincronização passiva (RNF001 / UC05 passo 4)', () => {
  it('envia sozinha os pendentes quando o dispositivo está online — sem abrir a folha de sincronização', async () => {
    const p = await novoPaciente();
    await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    render(<AutoSync />);

    await waitFor(() => expect(mockedPush).toHaveBeenCalled());
    const enviados = (mockedPush.mock.calls[0]?.[1] ?? []).map((r) => r.id);
    expect(enviados).toContain(p.id);
  });

  it('não tenta sincronizar quando o dispositivo está offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const p = await novoPaciente();
    await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    render(<AutoSync />);

    await new Promise((r) => setTimeout(r, 60));
    expect(mockedPush).not.toHaveBeenCalled();
    // Os dados permanecem no dataset local.
    expect(await db.outbox.count()).toBe(2);
  });

  it('não sincroniza sem sessão ativa', async () => {
    useAuth.setState({ accessToken: null, refreshToken: null, user: null });
    const p = await novoPaciente();
    await putLocalVisit({ patientId: p.id, measurements: { ldl: 160 } });

    render(<AutoSync />);

    await new Promise((r) => setTimeout(r, 60));
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
