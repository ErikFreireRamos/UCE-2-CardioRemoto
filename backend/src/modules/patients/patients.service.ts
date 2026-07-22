import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { normalizeCpf } from '../../lib/cpf.js';
import { sortByVisitPriority, type RiskLevel } from '../../domain/clinical/index.js';
import type { CreatePatientInput, ListPatientsQuery } from './patients.schema.js';
import { toDetail, toListItem, type PatientWithVisits } from './patient.presenter.js';

const withVisits = {
  visits: { include: { measurement: true }, orderBy: { collectedAt: 'desc' } },
} satisfies Prisma.PatientInclude;

/** Cadastrar paciente (UC02). CPF duplicado → 409 com referência ao cadastro existente. */
export async function createPatient(app: FastifyInstance, input: CreatePatientInput) {
  const identifier = normalizeCpf(input.identifier);

  const existing = await app.prisma.patient.findUnique({ where: { identifier } });
  if (existing) {
    throw new ConflictError('Paciente já cadastrado com este CPF.', {
      existingPatientId: existing.id,
      socialName: existing.socialName,
    });
  }

  const patient = await app.prisma.patient.create({
    data: {
      identifier,
      socialName: input.socialName,
      birthDate: input.birthDate,
      biologicalSex: input.biologicalSex,
      smokingStatus: input.smokingStatus,
      physicalActivity: input.physicalActivity,
      usesStatin: input.usesStatin,
      cardiovascularHistory: input.cardiovascularHistory,
      cardiovascularEventAt: input.cardiovascularEventAt ?? null,
      riskLevel: 'sem_dados',
    },
    include: withVisits,
  });
  return toDetail(patient as PatientWithVisits);
}

/** Lista de pacientes (UC03 filtro por risco / UC04 ordenação por prioridade / busca). */
export async function listPatients(app: FastifyInstance, query: ListPatientsQuery) {
  const now = new Date();
  const where: Prisma.PatientWhereInput = {};

  if (query.risk !== 'todos') {
    where.riskLevel = query.risk as RiskLevel;
  }
  if (query.search) {
    const digits = normalizeCpf(query.search);
    where.OR = [
      { socialName: { contains: query.search, mode: 'insensitive' } },
      ...(digits ? [{ identifier: { contains: digits } }] : []),
    ];
  }

  const patients = (await app.prisma.patient.findMany({
    where,
    include: withVisits,
  })) as PatientWithVisits[];

  const items = patients.map((p) => toListItem(p, now));

  if (query.sort === 'name') {
    items.sort((a, b) => a.socialName.localeCompare(b.socialName));
  } else {
    // Ordenação por prioridade de visita: sem-visita primeiro, depois atrasados, depois próximos.
    return {
      count: items.length,
      sort: query.sort,
      items: sortByVisitPriority(
        items,
        (i) => ({
          lastVisitAt: i.lastVisitAt ? new Date(i.lastVisitAt) : null,
          risk: i.riskLevel,
          tiebreaker: i.socialName,
        }),
        now,
      ),
    };
  }

  return { count: items.length, sort: query.sort, items };
}

/** Perfil completo do paciente. */
export async function getPatient(app: FastifyInstance, id: string) {
  const patient = (await app.prisma.patient.findUnique({
    where: { id },
    include: withVisits,
  })) as PatientWithVisits | null;
  if (!patient) throw new NotFoundError('Paciente não encontrado');
  return toDetail(patient);
}
