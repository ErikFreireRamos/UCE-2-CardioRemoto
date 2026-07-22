import { db } from '../../data/db';
import type { OutboxItem } from '../../data/schema';
import type { SyncRecord } from '../../api/endpoints';

/** Constrói o registro de sync a partir de um item do outbox + a entidade local atual. */
export async function normalizeForSync(item: OutboxItem): Promise<SyncRecord | null> {
  if (item.entity === 'patient') {
    const p = await db.patients.get(item.id);
    if (!p) return null;
    return {
      entity: 'patient',
      id: p.id,
      updatedAt: p.updatedAt,
      data: {
        identifier: p.identifier,
        socialName: p.socialName,
        birthDate: p.birthDate,
        biologicalSex: p.biologicalSex,
        smokingStatus: p.smokingStatus,
        physicalActivity: p.physicalActivity,
        usesStatin: p.usesStatin,
        cardiovascularHistory: p.cardiovascularHistory,
        cardiovascularEventAt: p.cardiovascularEventAt ?? null,
      },
    };
  }
  const v = await db.visits.get(item.id);
  if (!v) return null;
  return {
    entity: 'visit',
    id: v.id,
    updatedAt: v.updatedAt,
    data: {
      patientId: v.patientId,
      collectedAt: v.collectedAt,
      measurement: v.measurements,
    },
  };
}
