import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { BadRequestError } from '../../lib/errors.js';
import { normalizeCpf } from '../../lib/cpf.js';
import { calcBmi } from '../../domain/clinical/index.js';
import { deriveRiskAndLastVisit, type PatientWithVisits } from '../patients/patient.presenter.js';
import { syncPatientData, syncVisitData, type SyncPushInput, type SyncRecord } from './sync.schema.js';

interface SyncResult {
  syncedAt: string;
  synced: string[];
  failed: { id: string; reason: string }[];
}

const withVisits = {
  visits: { include: { measurement: true }, orderBy: { collectedAt: 'desc' } },
} satisfies Prisma.PatientInclude;

/**
 * Push de um lote criado offline (UC07 / RNF001).
 *  - Upsert idempotente por `id` (UUID do cliente).
 *  - Resolução de conflito last-write-wins: se o registro no servidor já é igual ou mais novo
 *    (updatedAt), o de entrada é ignorado (também garante idempotência no reenvio do mesmo lote).
 *  - Falha parcial: cada registro é isolado; falhas voltam em `failed` sem abortar o lote nem
 *    perder dados (o cliente mantém os pendentes e re-tenta).
 *  - Ordem de chegada arbitrária: pacientes são processados antes das visitas.
 */
export async function pushSync(app: FastifyInstance, authorId: string, input: SyncPushInput): Promise<SyncResult> {
  if (!input.records || input.records.length === 0) {
    throw new BadRequestError('Lote de sincronização vazio.');
  }

  const synced: string[] = [];
  const failed: { id: string; reason: string }[] = [];
  const touchedPatients = new Set<string>();

  // Pacientes antes de visitas (a visita pode depender de um paciente do mesmo lote).
  const ordered = [...input.records].sort((a, b) => (a.entity === b.entity ? 0 : a.entity === 'patient' ? -1 : 1));

  for (const record of ordered) {
    try {
      if (record.entity === 'patient') {
        await upsertPatient(app, record);
        touchedPatients.add(record.id);
      } else {
        const patientId = await upsertVisit(app, authorId, record);
        touchedPatients.add(patientId);
      }
      synced.push(record.id);
    } catch (err) {
      failed.push({ id: record.id, reason: err instanceof Error ? err.message : 'erro desconhecido' });
    }
  }

  // Recalcula lastVisitAt/riskLevel dos pacientes tocados.
  for (const patientId of touchedPatients) {
    const full = (await app.prisma.patient.findUnique({ where: { id: patientId }, include: withVisits })) as PatientWithVisits | null;
    if (!full) continue;
    const { lastVisitAt, riskLevel } = deriveRiskAndLastVisit(full);
    await app.prisma.patient.update({ where: { id: patientId }, data: { lastVisitAt, riskLevel } });
  }

  await app.prisma.syncLog.create({
    data: {
      authorId,
      deviceId: input.deviceId,
      recordsCount: input.records.length,
      status: failed.length === 0 ? 'success' : synced.length === 0 ? 'failed' : 'partial',
    },
  });

  return { syncedAt: new Date().toISOString(), synced, failed };
}

async function upsertPatient(app: FastifyInstance, record: SyncRecord): Promise<void> {
  const data = syncPatientData.parse(record.data);
  const existing = await app.prisma.patient.findUnique({ where: { id: record.id } });
  // Last-write-wins: servidor já igual/mais novo → no-op (idempotente).
  if (existing && existing.updatedAt >= record.updatedAt) return;

  const payload = {
    identifier: normalizeCpf(data.identifier),
    socialName: data.socialName,
    birthDate: data.birthDate,
    biologicalSex: data.biologicalSex,
    smokingStatus: data.smokingStatus,
    physicalActivity: data.physicalActivity,
    usesStatin: data.usesStatin,
    cardiovascularHistory: data.cardiovascularHistory,
    cardiovascularEventAt: data.cardiovascularEventAt ?? null,
  };

  await app.prisma.patient.upsert({
    where: { id: record.id },
    create: { id: record.id, ...payload },
    update: payload,
  });
}

async function upsertVisit(app: FastifyInstance, authorId: string, record: SyncRecord): Promise<string> {
  const data = syncVisitData.parse(record.data);

  const patient = await app.prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) {
    // Cliente deve reter e re-tentar quando o paciente chegar.
    throw new Error('patient_not_found');
  }

  const existing = await app.prisma.visit.findUnique({ where: { id: record.id } });
  if (existing && existing.updatedAt >= record.updatedAt) return data.patientId;

  const bmi = calcBmi(data.measurement.weight, data.measurement.height);

  await app.prisma.visit.upsert({
    where: { id: record.id },
    create: {
      id: record.id,
      patientId: data.patientId,
      authorId: data.authorId ?? authorId,
      collectedAt: data.collectedAt,
      syncedAt: new Date(),
      measurement: { create: { ...data.measurement, bmi } },
    },
    update: {
      collectedAt: data.collectedAt,
      syncedAt: new Date(),
      measurement: {
        upsert: {
          create: { ...data.measurement, bmi },
          update: { ...data.measurement, bmi },
        },
      },
    },
  });
  return data.patientId;
}

/** Pull incremental (GET /sync/pull?since=): mudanças do servidor desde um timestamp. */
export async function pullSync(app: FastifyInstance, since?: Date) {
  const where = since ? { updatedAt: { gt: since } } : {};
  const [patients, visits] = await Promise.all([
    app.prisma.patient.findMany({ where }),
    app.prisma.visit.findMany({ where, include: { measurement: true } }),
  ]);
  return { serverTime: new Date().toISOString(), patients, visits };
}
