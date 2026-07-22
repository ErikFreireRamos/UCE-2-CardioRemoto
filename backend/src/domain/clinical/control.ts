import { GOALS } from './goals.js';
import type { ControlSnapshot, VisitLike } from './types.js';

function toTime(d: Date | string): number {
  return (typeof d === 'string' ? new Date(d) : d).getTime();
}

/**
 * Decisão de projeto (confirmada): para cada métrica de meta (PA sistólica/diastólica, HbA1c, LDL)
 * usamos o ÚLTIMO valor disponível em QUALQUER visita — as métricas podem vir de visitas diferentes,
 * já que cada visita pode ter só alguns campos preenchidos. Métrica nunca medida permanece `null`
 * e NÃO conta como fora da meta.
 */
export function latestControl(visits: readonly VisitLike[]): ControlSnapshot {
  const sorted = [...visits].sort((a, b) => toTime(b.collectedAt) - toTime(a.collectedAt));
  const snapshot: ControlSnapshot = {
    bloodPressureSystolic: null,
    bloodPressureDiastolic: null,
    hba1c: null,
    ldl: null,
  };
  const found = { bp: false, hba1c: false, ldl: false };

  for (const visit of sorted) {
    const m = visit.measurement;
    if (!m) continue;
    // PA sistólica e diastólica são tratadas como um par (vêm juntas na aferição).
    if (!found.bp && m.bloodPressureSystolic != null && m.bloodPressureDiastolic != null) {
      snapshot.bloodPressureSystolic = m.bloodPressureSystolic;
      snapshot.bloodPressureDiastolic = m.bloodPressureDiastolic;
      found.bp = true;
    }
    if (!found.hba1c && m.hba1c != null) {
      snapshot.hba1c = m.hba1c;
      found.hba1c = true;
    }
    if (!found.ldl && m.ldl != null) {
      snapshot.ldl = m.ldl;
      found.ldl = true;
    }
    if (found.bp && found.hba1c && found.ldl) break;
  }
  return snapshot;
}

/** PA dentro da meta quando sistólica < 140 E diastólica < 90. `null` = não avaliável. */
export function isPaInGoal(systolic: number | null, diastolic: number | null): boolean | null {
  if (systolic == null || diastolic == null) return null;
  return systolic < GOALS.bloodPressureSystolic && diastolic < GOALS.bloodPressureDiastolic;
}

export function isHba1cInGoal(hba1c: number | null): boolean | null {
  if (hba1c == null) return null;
  return hba1c < GOALS.hba1c;
}

export function isLdlInGoal(ldl: number | null): boolean | null {
  if (ldl == null) return null;
  return ldl < GOALS.ldl;
}

/**
 * Conta, entre as métricas MEDIDAS, quantas estão fora da meta.
 * `measured` = quantos dos 3 parâmetros (PA, HbA1c, LDL) têm valor conhecido.
 */
export function countOutOfGoal(c: ControlSnapshot): { measured: number; outOfGoal: number } {
  let measured = 0;
  let outOfGoal = 0;

  const pa = isPaInGoal(c.bloodPressureSystolic, c.bloodPressureDiastolic);
  if (pa !== null) {
    measured += 1;
    if (!pa) outOfGoal += 1;
  }
  const hba1c = isHba1cInGoal(c.hba1c);
  if (hba1c !== null) {
    measured += 1;
    if (!hba1c) outOfGoal += 1;
  }
  const ldl = isLdlInGoal(c.ldl);
  if (ldl !== null) {
    measured += 1;
    if (!ldl) outOfGoal += 1;
  }
  return { measured, outOfGoal };
}
