import type { LocalVisit } from '../../data/schema';
import { GOALS, GLYCEMIA_DISPLAY_GOAL } from '../../clinical';

export interface EvoPoint { date: string; y: number; display: string }
export interface EvoSeries {
  metric: string;
  label: string;
  unit: string;
  goalLine: number | null;
  goalText: string;
  color: string;
  points: EvoPoint[];
  latest: EvoPoint | null;
  status: 'na-meta' | 'acima' | 'sem-dado';
}

const asc = (visits: LocalVisit[]) => [...visits].sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime());

function statusOf(value: number | null, goal: number, lowerIsBetter = true): EvoSeries['status'] {
  if (value == null) return 'sem-dado';
  return (lowerIsBetter ? value < goal : value > goal) ? 'na-meta' : 'acima';
}

export function buildSeries(visits: LocalVisit[]): EvoSeries[] {
  const v = asc(visits);
  const series: EvoSeries[] = [];

  const pa = v.filter((x) => x.measurements.bloodPressureSystolic != null && x.measurements.bloodPressureDiastolic != null);
  const paPoints = pa.map((x) => ({ date: x.collectedAt, y: x.measurements.bloodPressureSystolic!, display: `${x.measurements.bloodPressureSystolic}/${x.measurements.bloodPressureDiastolic}` }));
  series.push({ metric: 'pa', label: 'Pressão arterial', unit: 'mmHg', goalLine: GOALS.paSystolic, goalText: 'meta < 140/90', color: '#DC2626', points: paPoints, latest: paPoints.at(-1) ?? null, status: statusOf(paPoints.at(-1)?.y ?? null, GOALS.paSystolic) });

  const gl = v.filter((x) => x.measurements.capillaryGlycemia != null).map((x) => ({ date: x.collectedAt, y: x.measurements.capillaryGlycemia!, display: String(x.measurements.capillaryGlycemia) }));
  series.push({ metric: 'glicemia', label: 'Glicemia capilar', unit: 'mg/dL', goalLine: GLYCEMIA_DISPLAY_GOAL, goalText: 'meta < 180', color: '#E2725B', points: gl, latest: gl.at(-1) ?? null, status: statusOf(gl.at(-1)?.y ?? null, GLYCEMIA_DISPLAY_GOAL) });

  const ldl = v.filter((x) => x.measurements.ldl != null).map((x) => ({ date: x.collectedAt, y: x.measurements.ldl!, display: String(x.measurements.ldl) }));
  series.push({ metric: 'ldl', label: 'Colesterol LDL', unit: 'mg/dL', goalLine: GOALS.ldl, goalText: 'meta < 130', color: '#9A6B00', points: ldl, latest: ldl.at(-1) ?? null, status: statusOf(ldl.at(-1)?.y ?? null, GOALS.ldl) });

  const hb = v.filter((x) => x.measurements.hba1c != null).map((x) => ({ date: x.collectedAt, y: x.measurements.hba1c!, display: String(x.measurements.hba1c).replace('.', ',') }));
  series.push({ metric: 'hba1c', label: 'HbA1c', unit: '%', goalLine: GOALS.hba1c, goalText: 'meta < 7', color: '#0F5750', points: hb, latest: hb.at(-1) ?? null, status: statusOf(hb.at(-1)?.y ?? null, GOALS.hba1c) });

  const peso = v.filter((x) => x.measurements.weight != null).map((x) => ({ date: x.collectedAt, y: x.measurements.weight!, display: String(x.measurements.weight).replace('.', ',') }));
  series.push({ metric: 'peso', label: 'Peso', unit: 'kg', goalLine: null, goalText: '', color: '#5A4E42', points: peso, latest: peso.at(-1) ?? null, status: 'sem-dado' });

  return series.filter((s) => s.points.length > 0);
}

/** Datas ordenadas (eixo x compartilhado). */
export function sharedDates(visits: LocalVisit[]): string[] {
  return asc(visits).map((v) => v.collectedAt);
}
