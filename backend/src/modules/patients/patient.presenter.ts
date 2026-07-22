import type { Patient, Visit, Measurement } from '@prisma/client';
import {
  calcAge,
  classifyRisk,
  isHba1cInGoal,
  isLdlInGoal,
  isPaInGoal,
  latestControl,
  mostSevereAlert,
  nextVisitDate,
  visitAlerts,
  visitStatus,
  type Alert,
  type RiskLevel,
  type VisitLike,
} from '../../domain/clinical/index.js';

export type VisitWithMeasurement = Visit & { measurement: Measurement | null };
export type PatientWithVisits = Patient & { visits: VisitWithMeasurement[] };

function toVisitLike(v: VisitWithMeasurement): VisitLike {
  return { collectedAt: v.collectedAt, measurement: v.measurement ?? undefined };
}

/** Recalcula lastVisitAt + riskLevel a partir das visitas (fonte de verdade para persistir). */
export function deriveRiskAndLastVisit(patient: PatientWithVisits, now = new Date()): {
  lastVisitAt: Date | null;
  riskLevel: RiskLevel;
} {
  const visitLikes = patient.visits.map(toVisitLike);
  const control = latestControl(visitLikes);
  const riskLevel = classifyRisk({
    control,
    cardiovascularHistory: patient.cardiovascularHistory,
    cardiovascularEventAt: patient.cardiovascularEventAt,
    now,
  });
  const lastVisitAt = patient.visits.reduce<Date | null>((max, v) => {
    return !max || v.collectedAt > max ? v.collectedAt : max;
  }, null);
  return { lastVisitAt, riskLevel };
}

/** Alerta ativo mais grave, considerando a visita mais recente. */
export function activeAlert(patient: PatientWithVisits): Alert | null {
  const latest = [...patient.visits].sort(
    (a, b) => b.collectedAt.getTime() - a.collectedAt.getTime(),
  )[0];
  if (!latest?.measurement) return null;
  return mostSevereAlert(visitAlerts(latest.measurement));
}

/** DTO resumido para a lista de pacientes (UC03/UC04). */
export function toListItem(patient: PatientWithVisits, now = new Date()) {
  const risk = patient.riskLevel as RiskLevel;
  const next = nextVisitDate(patient.lastVisitAt, risk);
  return {
    id: patient.id,
    identifier: patient.identifier,
    socialName: patient.socialName,
    age: calcAge(patient.birthDate, now),
    biologicalSex: patient.biologicalSex,
    riskLevel: risk,
    lastVisitAt: patient.lastVisitAt?.toISOString() ?? null,
    nextVisitDate: next?.toISOString() ?? null,
    visitStatus: visitStatus(patient.lastVisitAt, risk, now),
    activeAlert: activeAlert(patient),
  };
}

/** DTO completo do perfil (UC02 detalhe + controle atual). */
export function toDetail(patient: PatientWithVisits, now = new Date()) {
  const risk = patient.riskLevel as RiskLevel;
  const control = latestControl(patient.visits.map(toVisitLike));
  const pa =
    control.bloodPressureSystolic != null && control.bloodPressureDiastolic != null
      ? `${control.bloodPressureSystolic}/${control.bloodPressureDiastolic}`
      : null;

  return {
    id: patient.id,
    identifier: patient.identifier,
    socialName: patient.socialName,
    birthDate: patient.birthDate.toISOString(),
    age: calcAge(patient.birthDate, now),
    biologicalSex: patient.biologicalSex,
    riskFactors: {
      smokingStatus: patient.smokingStatus,
      physicalActivity: patient.physicalActivity,
      usesStatin: patient.usesStatin,
      cardiovascularHistory: patient.cardiovascularHistory,
      cardiovascularEventAt: patient.cardiovascularEventAt?.toISOString() ?? null,
    },
    currentControl: {
      bloodPressure: { value: pa, inGoal: isPaInGoal(control.bloodPressureSystolic, control.bloodPressureDiastolic) },
      hba1c: { value: control.hba1c, inGoal: isHba1cInGoal(control.hba1c) },
      ldl: { value: control.ldl, inGoal: isLdlInGoal(control.ldl) },
    },
    riskLevel: risk,
    lastVisitAt: patient.lastVisitAt?.toISOString() ?? null,
    nextVisitDate: nextVisitDate(patient.lastVisitAt, risk)?.toISOString() ?? null,
    visitStatus: visitStatus(patient.lastVisitAt, risk, now),
    visitsCount: patient.visits.length,
  };
}
