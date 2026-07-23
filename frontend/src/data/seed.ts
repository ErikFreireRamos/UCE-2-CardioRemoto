import { db, getMeta, setMeta } from './db';
import { newId } from '../lib/uuid';
import type { LocalPatient, LocalVisit } from './schema';
import { PERIODICITY_MONTHS, type Measurements, type RiskLevel } from '../clinical';

const now = new Date();
function addDays(base: Date, n: number): Date { const d = new Date(base); d.setUTCDate(d.getUTCDate() + n); return d; }
function addMonths(base: Date, n: number): Date {
  const d = new Date(base); const day = d.getUTCDate(); d.setUTCMonth(d.getUTCMonth() + n);
  if (d.getUTCDate() < day) d.setUTCDate(0); return d;
}
const iso = (d: Date) => d.toISOString();
const cpf = (base9: string) => base9; // seed local não valida DV; usa dígitos ilustrativos

interface Spec {
  identifier: string; socialName: string; birthDate: string; sex: 'F' | 'M';
  smoking: LocalPatient['smokingStatus']; activity: LocalPatient['physicalActivity'];
  statin: boolean; history: LocalPatient['cardiovascularHistory']; eventAt?: string | null;
  d: number; risk: RiskLevel; visits: { off: number; m: Measurements }[];
}

const specs: Spec[] = [
  { identifier: '11144477735', socialName: 'Maria Silva', birthDate: '1968-03-12', sex: 'F', smoking: 'ex_fumante', activity: 'raramente', statin: true, history: 'IAM', eventAt: iso(addMonths(now, -4)), d: -3, risk: 'vermelho',
    visits: [
      { off: 0, m: { weight: 72.5, height: 158, waistCircumference: 94, bloodPressureSystolic: 142, bloodPressureDiastolic: 88, capillaryGlycemia: 150, hba1c: 6.9, ldl: 160, hdl: 42, totalCholesterol: 240, triglycerides: 190 } },
      { off: -15, m: { bloodPressureSystolic: 146, bloodPressureDiastolic: 92, capillaryGlycemia: 168 } },
      { off: -43, m: { bloodPressureSystolic: 152, bloodPressureDiastolic: 96, capillaryGlycemia: 182, hba1c: 7.6, ldl: 178 } },
      { off: -58, m: { bloodPressureSystolic: 160, bloodPressureDiastolic: 100, capillaryGlycemia: 196, ldl: 188 } },
      { off: -102, m: { bloodPressureSystolic: 168, bloodPressureDiastolic: 104, capillaryGlycemia: 210, hba1c: 8.4, ldl: 196 } },
    ] },
  { identifier: '22255588846', socialName: 'José Nunes', birthDate: '1959-08-01', sex: 'M', smoking: 'fumante', activity: 'nao_praticante', statin: false, history: 'nao', d: -1, risk: 'amarelo',
    visits: [
      { off: 0, m: { weight: 84, height: 172, bloodPressureSystolic: 132, bloodPressureDiastolic: 85, capillaryGlycemia: 138, hba1c: 6.5, ldl: 196, hdl: 38, totalCholesterol: 260 } },
      { off: -30, m: { bloodPressureSystolic: 134, bloodPressureDiastolic: 86, ldl: 188 } },
      { off: -75, m: { bloodPressureSystolic: 130, bloodPressureDiastolic: 84, hba1c: 6.7, ldl: 176 } },
    ] },
  { identifier: '33366699957', socialName: 'Tiago Feitosa', birthDate: '1965-11-23', sex: 'M', smoking: 'fumante', activity: 'nao_praticante', statin: true, history: 'DAP', eventAt: iso(addMonths(now, -20)), d: 0, risk: 'vermelho',
    visits: [
      { off: 0, m: { weight: 91, height: 175, waistCircumference: 108, bloodPressureSystolic: 184, bloodPressureDiastolic: 121, heartRate: 88, capillaryGlycemia: 176, hba1c: 7.5, ldl: 150 } },
      { off: -28, m: { bloodPressureSystolic: 178, bloodPressureDiastolic: 116, hba1c: 7.8, ldl: 162 } },
    ] },
  { identifier: '44477711107', socialName: 'Lucas Cavalcante', birthDate: '1972-05-09', sex: 'M', smoking: 'nao_fumante', activity: 'regularmente', statin: false, history: 'nao', d: 2, risk: 'amarelo',
    visits: [
      { off: 0, m: { weight: 78, height: 178, bloodPressureSystolic: 138, bloodPressureDiastolic: 86, capillaryGlycemia: 120, hba1c: 7.2, ldl: 118 } },
      { off: -35, m: { bloodPressureSystolic: 136, bloodPressureDiastolic: 84, hba1c: 7.4 } },
    ] },
  { identifier: '55588822200', socialName: 'Carla Nascimento', birthDate: '1977-02-18', sex: 'F', smoking: 'nao_fumante', activity: 'frequentemente', statin: false, history: 'nao', d: 4, risk: 'verde',
    visits: [
      { off: 0, m: { weight: 63, height: 165, bloodPressureSystolic: 120, bloodPressureDiastolic: 78, capillaryGlycemia: 96, hba1c: 5.9, ldl: 110, hdl: 58 } },
      { off: -85, m: { bloodPressureSystolic: 122, bloodPressureDiastolic: 80, hba1c: 5.8, ldl: 108 } },
    ] },
  { identifier: '66699933310', socialName: 'Luana Torres', birthDate: '1985-09-30', sex: 'F', smoking: 'nao_fumante', activity: 'regularmente', statin: false, history: 'nao', d: 5, risk: 'verde',
    visits: [{ off: 0, m: { weight: 58, height: 162, bloodPressureSystolic: 118, bloodPressureDiastolic: 76, capillaryGlycemia: 90, hba1c: 5.5, ldl: 100 } }] },
];

/** Popula o dataset local uma única vez (idempotente por flag). */
export async function seedIfEmpty(): Promise<void> {
  if (await getMeta('seeded')) return;
  const patients: LocalPatient[] = [];
  const visits: LocalVisit[] = [];
  const ts = iso(now);

  for (const s of specs) {
    const id = newId();
    patients.push({
      id, identifier: cpf(s.identifier), socialName: s.socialName, birthDate: iso(new Date(`${s.birthDate}T00:00:00Z`)),
      biologicalSex: s.sex, smokingStatus: s.smoking, physicalActivity: s.activity, usesStatin: s.statin,
      cardiovascularHistory: s.history, cardiovascularEventAt: s.eventAt ?? null,
      createdAt: ts, updatedAt: ts, syncState: 'synced',
    });
    const mostRecent = addMonths(addDays(now, s.d), -PERIODICITY_MONTHS[s.risk]);
    for (const v of s.visits) {
      const collectedAt = iso(addDays(mostRecent, v.off));
      visits.push({ id: newId(), patientId: id, collectedAt, authorId: null, measurements: v.m, createdAt: collectedAt, updatedAt: collectedAt, syncState: 'synced' });
    }
  }

  await db.transaction('rw', db.patients, db.visits, db.syncMeta, async () => {
    await db.patients.bulkPut(patients);
    await db.visits.bulkPut(visits);
    await setMeta('seeded', ts);
  });
}
