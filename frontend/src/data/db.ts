import Dexie, { type Table } from 'dexie';
import type { LocalPatient, LocalVisit, OutboxItem, SyncMetaRow } from './schema';

/** Banco local (IndexedDB) — dataset offline-first + fila de sincronização. */
export class CardioDB extends Dexie {
  patients!: Table<LocalPatient, string>;
  visits!: Table<LocalVisit, string>;
  outbox!: Table<OutboxItem, string>;
  syncMeta!: Table<SyncMetaRow, string>;

  constructor() {
    super('cardioremoto');
    this.version(1).stores({
      patients: 'id, identifier, syncState, updatedAt',
      visits: 'id, patientId, syncState, collectedAt, updatedAt',
      outbox: 'id, entity, createdAt',
      syncMeta: 'key',
    });
  }
}

export const db = new CardioDB();

export async function getMeta(key: string): Promise<string | undefined> {
  return (await db.syncMeta.get(key))?.value;
}
export async function setMeta(key: string, value: string): Promise<void> {
  await db.syncMeta.put({ key, value });
}
