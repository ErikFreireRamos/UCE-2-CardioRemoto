import { db } from './db';
import type { LocalPatient, LocalVisit } from './schema';
import type { Measurements } from '../clinical';

export function newId(): string {
  return crypto.randomUUID();
}

export type NewPatientInput = Omit<LocalPatient, 'id' | 'createdAt' | 'updatedAt' | 'syncState'>;
export type NewVisitInput = { patientId: string; collectedAt?: string; authorId?: string | null; measurements: Measurements };

/**
 * Grava um paciente localmente (offline-first) e enfileira para sync — TUDO na mesma transação,
 * para não haver janela de perda de dados.
 */
export async function putLocalPatient(input: NewPatientInput): Promise<LocalPatient> {
  const now = new Date().toISOString();
  const patient: LocalPatient = { ...input, id: newId(), createdAt: now, updatedAt: now, syncState: 'pending' };
  await db.transaction('rw', db.patients, db.outbox, async () => {
    await db.patients.put(patient);
    await db.outbox.put({ id: patient.id, entity: 'patient', createdAt: now, attempts: 0 });
  });
  return patient;
}

export async function putLocalVisit(input: NewVisitInput): Promise<LocalVisit> {
  const now = new Date().toISOString();
  const visit: LocalVisit = {
    id: newId(),
    patientId: input.patientId,
    collectedAt: input.collectedAt ?? now,
    authorId: input.authorId ?? null,
    measurements: input.measurements,
    createdAt: now,
    updatedAt: now,
    syncState: 'pending',
  };
  await db.transaction('rw', db.visits, db.outbox, async () => {
    await db.visits.put(visit);
    await db.outbox.put({ id: visit.id, entity: 'visit', createdAt: now, attempts: 0 });
  });
  return visit;
}

export async function findPatientByIdentifier(digits: string): Promise<LocalPatient | undefined> {
  return db.patients.where('identifier').equals(digits).first();
}

export async function getPatient(id: string): Promise<LocalPatient | undefined> {
  return db.patients.get(id);
}

export async function getVisitsByPatient(patientId: string): Promise<LocalVisit[]> {
  const visits = await db.visits.where('patientId').equals(patientId).toArray();
  return visits.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
}

export async function pendingCount(): Promise<number> {
  const [p, v] = await Promise.all([
    db.patients.where('syncState').anyOf('pending', 'failed').count(),
    db.visits.where('syncState').anyOf('pending', 'failed').count(),
  ]);
  return p + v;
}
