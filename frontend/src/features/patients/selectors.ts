import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import type { LocalPatient, LocalVisit } from '../../data/schema';
import {
  calcAge,
  classifyRisk,
  isHba1cInGoal,
  isLdlInGoal,
  isPaInGoal,
  latestControl,
  mostSevereAlertFromVisits,
  nextVisitDate,
  visitPriorityKey,
  visitStatus,
  type RiskLevel,
} from './compute';

export interface PatientListItem {
  id: string;
  identifier: string;
  socialName: string;
  initials: string;
  age: number;
  biologicalSex: 'F' | 'M';
  riskLevel: RiskLevel;
  lastVisitAt: string | null;
  visitStatus: string;
  activeAlert: string | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function buildItem(p: LocalPatient, visits: LocalVisit[], now: Date): PatientListItem {
  const patientVisits = visits.filter((v) => v.patientId === p.id);
  const control = latestControl(patientVisits);
  const risk = classifyRisk(control, p.cardiovascularHistory, p.cardiovascularEventAt, now);
  const lastVisitAt = patientVisits.reduce<string | null>((max, v) => (!max || v.collectedAt > max ? v.collectedAt : max), null);
  const alert = mostSevereAlertFromVisits(patientVisits);
  return {
    id: p.id,
    identifier: p.identifier,
    socialName: p.socialName,
    initials: initialsOf(p.socialName),
    age: calcAge(p.birthDate, now),
    biologicalSex: p.biologicalSex,
    riskLevel: risk,
    lastVisitAt,
    visitStatus: visitStatus(lastVisitAt, risk, now),
    activeAlert: alert?.message ?? null,
  };
}

export type RiskFilter = 'todos' | RiskLevel;

export function usePatientList(filter: RiskFilter, search: string): PatientListItem[] | undefined {
  return useLiveQuery(async () => {
    const now = new Date();
    const [patients, visits] = await Promise.all([db.patients.toArray(), db.visits.toArray()]);
    let items = patients.map((p) => buildItem(p, visits, now));

    if (filter !== 'todos') items = items.filter((i) => i.riskLevel === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      items = items.filter((i) => i.socialName.toLowerCase().includes(q) || (digits && i.identifier.includes(digits)));
    }

    // Ordena por prioridade de visita: sem-visita/atrasados primeiro.
    items.sort((a, b) => {
      const ka = visitPriorityKey(a.lastVisitAt, a.riskLevel, now);
      const kb = visitPriorityKey(b.lastVisitAt, b.riskLevel, now);
      if (ka !== kb) return ka - kb;
      return a.socialName.localeCompare(b.socialName);
    });
    return items;
  }, [filter, search]);
}

export interface PatientProfile extends PatientListItem {
  patient: LocalPatient;
  nextVisitDate: string | null;
  currentControl: {
    bloodPressure: { value: string | null; inGoal: boolean | null };
    hba1c: { value: number | null; inGoal: boolean | null };
    ldl: { value: number | null; inGoal: boolean | null };
  };
  visitsCount: number;
}

export function usePatientProfile(id: string | undefined): PatientProfile | undefined | null {
  return useLiveQuery(async () => {
    if (!id) return null;
    const p = await db.patients.get(id);
    if (!p) return null;
    const now = new Date();
    const visits = await db.visits.where('patientId').equals(id).toArray();
    const item = buildItem(p, visits, now);
    const control = latestControl(visits);
    const pa = control.bloodPressureSystolic != null && control.bloodPressureDiastolic != null
      ? `${control.bloodPressureSystolic}/${control.bloodPressureDiastolic}` : null;
    return {
      ...item,
      patient: p,
      nextVisitDate: nextVisitDate(item.lastVisitAt, item.riskLevel)?.toISOString() ?? null,
      currentControl: {
        bloodPressure: { value: pa, inGoal: isPaInGoal(control.bloodPressureSystolic, control.bloodPressureDiastolic) },
        hba1c: { value: control.hba1c, inGoal: isHba1cInGoal(control.hba1c) },
        ldl: { value: control.ldl, inGoal: isLdlInGoal(control.ldl) },
      },
      visitsCount: visits.length,
    };
  }, [id]);
}

export function usePatientVisits(id: string | undefined): LocalVisit[] | undefined {
  return useLiveQuery(async () => {
    if (!id) return [];
    const visits = await db.visits.where('patientId').equals(id).toArray();
    return visits.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  }, [id]);
}
