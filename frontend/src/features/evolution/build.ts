import type { LocalVisit } from '../../data/schema';
import { GOALS, GLYCEMIA_DISPLAY_GOAL, type Measurements } from '../../clinical';

export type MetricGroup = 'Antropométricos' | 'Medições vitais' | 'Exames laboratoriais';

export interface MetricDef {
  /** `pa` é composta (sistólica/diastólica); as demais mapeiam 1:1 em `Measurements`. */
  key: string;
  label: string;
  /** Rótulo curto para a tabela. */
  short: string;
  unit: string;
  group: MetricGroup;
  /** Limite de "dentro da meta" (valor < meta). `null` quando o dado não tem meta definida. */
  goal: number | null;
  goalText: string;
  color: string;
}

/**
 * Catálogo com TODOS os dados coletáveis numa visita, na ordem do documento de requisitos
 * (antropométricos → medições vitais → exames laboratoriais). É a base tanto da tabela de
 * evolução (UC06 passo 2: "todos os dados coletados") quanto da seleção de séries do gráfico
 * (UC06 passo 3: "um ou mais desses dados pode ser selecionado").
 */
export const METRICS: readonly MetricDef[] = [
  { key: 'weight', label: 'Peso', short: 'Peso', unit: 'kg', group: 'Antropométricos', goal: null, goalText: '', color: '#5A4E42' },
  { key: 'height', label: 'Altura', short: 'Altura', unit: 'cm', group: 'Antropométricos', goal: null, goalText: '', color: '#7A6A58' },
  { key: 'bmi', label: 'IMC', short: 'IMC', unit: 'kg/m²', group: 'Antropométricos', goal: null, goalText: '', color: '#8C6D3F' },
  { key: 'waistCircumference', label: 'Circunferência da cintura', short: 'Cintura', unit: 'cm', group: 'Antropométricos', goal: null, goalText: '', color: '#A07C4A' },
  { key: 'pa', label: 'Pressão arterial', short: 'PA', unit: 'mmHg', group: 'Medições vitais', goal: GOALS.paSystolic, goalText: 'meta < 140/90', color: '#DC2626' },
  { key: 'heartRate', label: 'Frequência cardíaca', short: 'FC', unit: 'bpm', group: 'Medições vitais', goal: null, goalText: '', color: '#B4436C' },
  { key: 'capillaryGlycemia', label: 'Glicemia capilar', short: 'Glic', unit: 'mg/dL', group: 'Medições vitais', goal: GLYCEMIA_DISPLAY_GOAL, goalText: 'meta < 180', color: '#E2725B' },
  { key: 'fastingGlucose', label: 'Glicose jejum', short: 'Gli jej', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#C2703D' },
  { key: 'hba1c', label: 'HbA1c', short: 'HbA1c', unit: '%', group: 'Exames laboratoriais', goal: GOALS.hba1c, goalText: 'meta < 7', color: '#0F5750' },
  { key: 'totalCholesterol', label: 'Colesterol total', short: 'CT', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#7A5C1E' },
  { key: 'hdl', label: 'HDL', short: 'HDL', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#2F7A5B' },
  { key: 'ldl', label: 'Colesterol LDL', short: 'LDL', unit: 'mg/dL', group: 'Exames laboratoriais', goal: GOALS.ldl, goalText: 'meta < 130', color: '#9A6B00' },
  { key: 'triglycerides', label: 'Triglicérides', short: 'TG', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#B4762A' },
  { key: 'creatinine', label: 'Creatinina', short: 'Creat', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#4C6B8A' },
  { key: 'urea', label: 'Ureia', short: 'Ureia', unit: 'mg/dL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#5E7C99' },
  { key: 'tsh', label: 'TSH', short: 'TSH', unit: 'µUI/mL', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#6B5B95' },
  { key: 'tgo', label: 'TGO', short: 'TGO', unit: 'U/L', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#7D6AA8' },
  { key: 'tgp', label: 'TGP', short: 'TGP', unit: 'U/L', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#8F79BB' },
  { key: 'cpk', label: 'CPK', short: 'CPK', unit: 'U/L', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#A08AC8' },
  { key: 'albuminCreatinineRatio', label: 'Relação albumina/creatinina', short: 'Alb/Cr', unit: 'mg/g', group: 'Exames laboratoriais', goal: null, goalText: '', color: '#3F7F7A' },
];
// Só recebem meta as métricas com limite definido no documento (PA < 140/90, HbA1c < 7%,
// LDL < 130 mg/dL) e a glicemia capilar, cuja meta < 180 é apenas de exibição.

/** Séries exibidas por padrão no gráfico (as métricas de meta clínica + peso). */
export const DEFAULT_METRICS: readonly string[] = ['pa', 'capillaryGlycemia', 'ldl', 'hba1c', 'weight'];

export const metricByKey = new Map(METRICS.map((m) => [m.key, m]));

const fmt = (v: number) => String(v).replace('.', ',');

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

/** Valor de uma métrica numa medição (`null` quando não foi coletada nessa visita). */
export function metricValue(m: Measurements | null | undefined, key: string): { y: number; display: string } | null {
  if (!m) return null;
  if (key === 'pa') {
    const sys = m.bloodPressureSystolic;
    const dia = m.bloodPressureDiastolic;
    if (sys == null || dia == null) return null;
    return { y: sys, display: `${sys}/${dia}` };
  }
  const v = m[key as keyof Measurements];
  if (v == null) return null;
  return { y: v, display: fmt(v) };
}

/** `true` dentro da meta, `false` fora, `null` quando a métrica não tem meta ou não foi coletada. */
export function metricInGoal(key: string, m: Measurements | null | undefined): boolean | null {
  const def = metricByKey.get(key);
  if (!def || !m) return null;
  if (key === 'pa') {
    const sys = m.bloodPressureSystolic;
    const dia = m.bloodPressureDiastolic;
    if (sys == null || dia == null) return null;
    return sys < GOALS.paSystolic && dia < GOALS.paDiastolic;
  }
  if (def.goal == null) return null;
  const v = m[key as keyof Measurements];
  return v == null ? null : v < def.goal;
}

/** Métricas que têm ao menos um valor coletado no histórico do paciente. */
export function availableMetrics(visits: LocalVisit[]): MetricDef[] {
  return METRICS.filter((def) => visits.some((v) => metricValue(v.measurements, def.key) != null));
}

/**
 * Séries temporais das métricas selecionadas (small multiples do UC06 — cada uma na sua própria
 * escala, resolvendo a sobreposição de grandezas diferentes no mesmo plano).
 */
export function buildSeries(visits: LocalVisit[], selected: readonly string[] = DEFAULT_METRICS): EvoSeries[] {
  const v = asc(visits);
  const series: EvoSeries[] = [];

  // Percorre o catálogo (e não a ordem de clique) para os small multiples ficarem sempre na mesma
  // sequência: antropométricos → vitais → laboratoriais.
  for (const def of METRICS) {
    const key = def.key;
    if (!selected.includes(key)) continue;
    const points: EvoPoint[] = [];
    for (const visit of v) {
      const value = metricValue(visit.measurements, key);
      if (value) points.push({ date: visit.collectedAt, ...value });
    }
    if (points.length === 0) continue;

    const last = v.filter((x) => metricValue(x.measurements, key) != null).at(-1);
    const inGoal = metricInGoal(key, last?.measurements);
    series.push({
      metric: def.key,
      label: def.label,
      unit: def.unit,
      goalLine: def.goal,
      goalText: def.goalText,
      color: def.color,
      points,
      latest: points.at(-1) ?? null,
      status: inGoal == null ? 'sem-dado' : inGoal ? 'na-meta' : 'acima',
    });
  }
  return series;
}

/** Datas ordenadas (eixo x compartilhado). */
export function sharedDates(visits: LocalVisit[]): string[] {
  return asc(visits).map((v) => v.collectedAt);
}
