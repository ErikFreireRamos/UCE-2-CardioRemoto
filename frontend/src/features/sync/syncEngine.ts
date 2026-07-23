import { db, getMeta, setMeta } from '../../data/db';
import { newId } from '../../lib/uuid';
import { normalizeForSync } from './mappers';
import { syncPull, syncPush, type SyncRecord } from '../../api/endpoints';

async function getDeviceId(): Promise<string> {
  let id = await getMeta('deviceId');
  if (!id) {
    id = newId();
    await setMeta('deviceId', id);
  }
  return id;
}

export interface SyncOutcome {
  synced: number;
  failed: number;
}

/** Uma única sincronização por vez (manual e passiva compartilham a mesma execução). */
let inFlight: Promise<SyncOutcome> | null = null;

export function runSync(): Promise<SyncOutcome> {
  if (inFlight) return inFlight;
  inFlight = doSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Envia os pendentes do outbox (idempotente por id), aplica o status parcial retornado pela API
 * (nunca perde dados locais) e depois puxa as mudanças do servidor.
 */
async function doSync(): Promise<SyncOutcome> {
  const deviceId = await getDeviceId();
  const outbox = await db.outbox.orderBy('createdAt').toArray();

  let syncedCount = 0;
  let failedCount = 0;

  if (outbox.length > 0) {
    const records: SyncRecord[] = [];
    for (const item of outbox) {
      const rec = await normalizeForSync(item);
      if (rec) records.push(rec);
    }

    const res = await syncPush(deviceId, records);
    const failedIds = new Set(res.failed.map((f) => f.id));

    await db.transaction('rw', db.patients, db.visits, db.outbox, async () => {
      for (const id of res.synced) {
        await markSynced(id);
        await db.outbox.delete(id);
      }
      for (const f of res.failed) {
        await markFailed(f.id, f.reason);
      }
    });
    syncedCount = res.synced.length;
    failedCount = res.failed.length;
    void failedIds;
  }

  // Pull incremental do servidor.
  await pullChanges();
  await setMeta('lastSyncAt', new Date().toISOString());
  return { synced: syncedCount, failed: failedCount };
}

async function markSynced(id: string): Promise<void> {
  const p = await db.patients.get(id);
  if (p) { await db.patients.update(id, { syncState: 'synced' }); return; }
  const v = await db.visits.get(id);
  if (v) await db.visits.update(id, { syncState: 'synced' });
}

async function markFailed(id: string, reason: string): Promise<void> {
  const p = await db.patients.get(id);
  if (p) { await db.patients.update(id, { syncState: 'failed' }); }
  const v = await db.visits.get(id);
  if (v) { await db.visits.update(id, { syncState: 'failed' }); }
  const item = await db.outbox.get(id);
  if (item) await db.outbox.update(id, { attempts: item.attempts + 1, lastError: reason });
}

/** Aplica mudanças do servidor no dataset local (não sobrescreve pendentes/failed locais). */
async function pullChanges(): Promise<void> {
  const since = await getMeta('lastPulledAt');
  const res = await syncPull(since ?? undefined);

  await db.transaction('rw', db.patients, db.visits, async () => {
    for (const raw of res.patients) {
      const p = raw as Record<string, unknown>;
      const id = p.id as string;
      const local = await db.patients.get(id);
      if (local && local.syncState !== 'synced') continue; // preserva edições locais
      await db.patients.put({
        id,
        identifier: String(p.identifier ?? ''),
        socialName: String(p.socialName ?? ''),
        birthDate: String(p.birthDate ?? ''),
        biologicalSex: p.biologicalSex as 'F' | 'M',
        smokingStatus: p.smokingStatus as never,
        physicalActivity: p.physicalActivity as never,
        usesStatin: Boolean(p.usesStatin),
        cardiovascularHistory: p.cardiovascularHistory as never,
        cardiovascularEventAt: (p.cardiovascularEventAt as string) ?? null,
        createdAt: String(p.createdAt ?? new Date().toISOString()),
        updatedAt: String(p.updatedAt ?? new Date().toISOString()),
        syncState: 'synced',
      });
    }
    for (const raw of res.visits) {
      const v = raw as Record<string, unknown>;
      const id = v.id as string;
      const local = await db.visits.get(id);
      if (local && local.syncState !== 'synced') continue;
      const measurement = (v.measurement as Record<string, number | null> | null) ?? {};
      await db.visits.put({
        id,
        patientId: String(v.patientId ?? ''),
        collectedAt: String(v.collectedAt ?? ''),
        authorId: (v.authorId as string) ?? null,
        measurements: measurement,
        createdAt: String(v.createdAt ?? new Date().toISOString()),
        updatedAt: String(v.updatedAt ?? new Date().toISOString()),
        syncState: 'synced',
      });
    }
  });

  await setMeta('lastPulledAt', res.serverTime);
}
