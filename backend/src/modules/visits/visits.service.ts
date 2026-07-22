import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';
import { calcBmi, visitAlerts } from '../../domain/clinical/index.js';
import { deriveRiskAndLastVisit, type PatientWithVisits } from '../patients/patient.presenter.js';
import { buildEvolution } from './evolution.js';
import { createVisitSchema, hasAtLeastOneField, type CreateVisitInput } from './visits.schema.js';

const withVisits = {
  visits: { include: { measurement: true }, orderBy: { collectedAt: 'desc' } },
} satisfies Prisma.PatientInclude;

/** Inserir nova visita (UC05). Exige ≥1 campo; calcula IMC; gera alertas; recalcula risco. */
export async function createVisit(app: FastifyInstance, patientId: string, authorId: string, input: CreateVisitInput) {
  const patient = await app.prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Paciente não encontrado');

  if (!hasAtLeastOneField(input.measurement)) {
    throw new UnprocessableEntityError('Ao menos um campo deve ser preenchido para registrar a visita.');
  }

  const collectedAt = input.collectedAt ?? new Date();
  const bmi = calcBmi(input.measurement.weight, input.measurement.height);

  const visit = await app.prisma.visit.create({
    data: {
      patientId,
      authorId,
      collectedAt,
      syncedAt: new Date(),
      measurement: { create: { ...input.measurement, bmi } },
    },
    include: { measurement: true },
  });

  // Recalcula lastVisitAt + riskLevel a partir de todas as visitas.
  const full = (await app.prisma.patient.findUnique({ where: { id: patientId }, include: withVisits })) as PatientWithVisits;
  const { lastVisitAt, riskLevel } = deriveRiskAndLastVisit(full);
  await app.prisma.patient.update({ where: { id: patientId }, data: { lastVisitAt, riskLevel } });

  const alerts = visitAlerts(visit.measurement);
  return { visit, alerts, riskLevel };
}

/** Histórico de visitas por data (UC06 tabela). */
export async function listVisits(app: FastifyInstance, patientId: string) {
  const patient = await app.prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Paciente não encontrado');
  const visits = await app.prisma.visit.findMany({
    where: { patientId },
    include: { measurement: true },
    orderBy: { collectedAt: 'desc' },
  });
  return { count: visits.length, items: visits };
}

/** Série temporal por métrica (UC06 gráfico small multiples). */
export async function getEvolution(app: FastifyInstance, patientId: string, metrics: string[]) {
  const patient = (await app.prisma.patient.findUnique({ where: { id: patientId }, include: withVisits })) as PatientWithVisits | null;
  if (!patient) throw new NotFoundError('Paciente não encontrado');
  return { patientId, metrics: buildEvolution(patient.visits, metrics) };
}

export { createVisitSchema };
