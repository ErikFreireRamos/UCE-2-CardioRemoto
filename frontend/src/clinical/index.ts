/**
 * Espelho das regras clínicas do backend, para feedback imediato offline.
 * O backend é a fonte de verdade; quando `riskLevel` vem da API, o cliente o exibe.
 */

export type RiskLevel = 'verde' | 'amarelo' | 'vermelho' | 'sem_dados';
export type CardiovascularHistory = 'nao' | 'IAM' | 'AVC' | 'DAP' | 'outro';
export type AlertLevel = 'vermelho' | 'amarelo';

export interface Measurements {
  weight?: number | null;
  height?: number | null;
  bmi?: number | null;
  waistCircumference?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  capillaryGlycemia?: number | null;
  fastingGlucose?: number | null;
  hba1c?: number | null;
  totalCholesterol?: number | null;
  hdl?: number | null;
  ldl?: number | null;
  triglycerides?: number | null;
  creatinine?: number | null;
  urea?: number | null;
  tsh?: number | null;
  tgo?: number | null;
  tgp?: number | null;
  cpk?: number | null;
  albuminCreatinineRatio?: number | null;
}

export const GOALS = { paSystolic: 140, paDiastolic: 90, hba1c: 7, ldl: 130 } as const;
export const ALERTS = { paSysHigh: 180, paDiaHigh: 120, paSysLow: 90, paDiaLow: 60, glyHigh: 250, glyLow: 70, ldlHigh: 190 } as const;
export const ATHEROSCLEROTIC: CardiovascularHistory[] = ['IAM', 'AVC', 'DAP'];
export const PERIODICITY_MONTHS: Record<RiskLevel, number> = { verde: 3, amarelo: 1, vermelho: 1, sem_dados: 1 };
export const GLYCEMIA_DISPLAY_GOAL = 180;

export function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function calcBmi(weight?: number | null, height?: number | null): number | null {
  if (weight == null || height == null || weight <= 0 || height <= 0) return null;
  const m = height / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

export function calcAge(birthDate: Date | string, now = new Date()): number {
  const b = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const md = now.getUTCMonth() - b.getUTCMonth();
  const dd = now.getUTCDate() - b.getUTCDate();
  if (md < 0 || (md === 0 && dd < 0)) age -= 1;
  return Math.max(0, age);
}

export interface VisitLike {
  collectedAt: string | Date;
  measurements?: Measurements | null;
}

export interface ControlSnapshot {
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  hba1c: number | null;
  ldl: number | null;
}

const time = (d: string | Date) => (typeof d === 'string' ? new Date(d) : d).getTime();

/** Último valor de cada métrica de meta em qualquer visita (métrica ausente = null). */
export function latestControl(visits: VisitLike[]): ControlSnapshot {
  const sorted = [...visits].sort((a, b) => time(b.collectedAt) - time(a.collectedAt));
  const c: ControlSnapshot = { bloodPressureSystolic: null, bloodPressureDiastolic: null, hba1c: null, ldl: null };
  let bp = false, hb = false, ld = false;
  for (const v of sorted) {
    const m = v.measurements;
    if (!m) continue;
    if (!bp && m.bloodPressureSystolic != null && m.bloodPressureDiastolic != null) {
      c.bloodPressureSystolic = m.bloodPressureSystolic; c.bloodPressureDiastolic = m.bloodPressureDiastolic; bp = true;
    }
    if (!hb && m.hba1c != null) { c.hba1c = m.hba1c; hb = true; }
    if (!ld && m.ldl != null) { c.ldl = m.ldl; ld = true; }
    if (bp && hb && ld) break;
  }
  return c;
}

export function isPaInGoal(sys: number | null, dia: number | null): boolean | null {
  if (sys == null || dia == null) return null;
  return sys < GOALS.paSystolic && dia < GOALS.paDiastolic;
}
export function isHba1cInGoal(v: number | null): boolean | null {
  return v == null ? null : v < GOALS.hba1c;
}
export function isLdlInGoal(v: number | null): boolean | null {
  return v == null ? null : v < GOALS.ldl;
}

export function classifyRisk(
  control: ControlSnapshot,
  history: CardiovascularHistory,
  eventAt?: string | Date | null,
  now = new Date(),
): RiskLevel {
  const flags = [isPaInGoal(control.bloodPressureSystolic, control.bloodPressureDiastolic), isHba1cInGoal(control.hba1c), isLdlInGoal(control.ldl)];
  const measured = flags.filter((f) => f !== null).length;
  if (measured === 0) return 'sem_dados';
  const outOfGoal = flags.filter((f) => f === false).length;
  const athero = ATHEROSCLEROTIC.includes(history);
  const recent = eventAt != null && (now.getTime() - time(eventAt)) / 86400000 <= 365;
  if (athero && recent) return 'vermelho';
  if (outOfGoal >= 3) return 'vermelho';
  if (athero && outOfGoal >= 1) return 'vermelho';
  if (outOfGoal >= 1) return 'amarelo';
  return 'verde';
}

export interface Alert { level: AlertLevel; field: string; message: string }

export function visitAlerts(m: Measurements): Alert[] {
  const a: Alert[] = [];
  const sys = m.bloodPressureSystolic, dia = m.bloodPressureDiastolic;
  const paHigh = (sys != null && sys >= ALERTS.paSysHigh) || (dia != null && dia >= ALERTS.paDiaHigh);
  const paLow = (sys != null && sys < ALERTS.paSysLow) || (dia != null && dia < ALERTS.paDiaLow);
  if (paHigh || paLow) a.push({ level: 'vermelho', field: 'bloodPressure', message: 'Alerta vermelho — PA fora da faixa segura' });
  const g = m.capillaryGlycemia;
  if (g != null && (g >= ALERTS.glyHigh || g < ALERTS.glyLow)) a.push({ level: 'vermelho', field: 'capillaryGlycemia', message: 'Alerta vermelho — glicemia ≥250 ou <70 mg/dL' });
  if (m.ldl != null && m.ldl >= ALERTS.ldlHigh) a.push({ level: 'amarelo', field: 'ldl', message: 'Alerta amarelo — LDL ≥190 mg/dL' });
  return a;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}
function diffDays(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / 86400000);
}

export function nextVisitDate(lastVisitAt: Date | string | null, risk: RiskLevel): Date | null {
  if (!lastVisitAt) return null;
  return addMonths(new Date(lastVisitAt), PERIODICITY_MONTHS[risk]);
}

const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`);

export function visitStatus(lastVisitAt: Date | string | null, risk: RiskLevel, now = new Date()): string {
  if (!lastVisitAt) return '1ª visita pendente';
  const next = nextVisitDate(lastVisitAt, risk)!;
  const d = diffDays(now, next);
  if (d < 0) return `${dias(-d)} atrasado`;
  if (d === 0) return 'hoje';
  return `${dias(d)} para visita`;
}

export function visitPriorityKey(lastVisitAt: Date | string | null, risk: RiskLevel, now = new Date()): number {
  if (!lastVisitAt) return Number.NEGATIVE_INFINITY;
  return diffDays(now, nextVisitDate(lastVisitAt, risk)!);
}
