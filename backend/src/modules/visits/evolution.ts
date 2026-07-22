import { GOALS, GLYCEMIA_DISPLAY_GOAL } from '../../domain/clinical/goals.js';
import type { VisitWithMeasurement } from '../patients/patient.presenter.js';

interface SeriesPoint {
  date: string;
  value?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
}

interface MetricSeries {
  metric: string;
  label: string;
  unit: string;
  goal: number | { systolic: number; diastolic: number };
  points: SeriesPoint[];
}

/**
 * Série temporal por métrica para os "small multiples" (UC06). Cada métrica em sua própria escala.
 * PA é retornada como par sistólica/diastólica; demais como valor único.
 */
export function buildEvolution(visits: VisitWithMeasurement[], metrics: string[]): MetricSeries[] {
  const asc = [...visits].sort((a, b) => a.collectedAt.getTime() - b.collectedAt.getTime());
  const series: MetricSeries[] = [];

  const point = (v: VisitWithMeasurement) => v.collectedAt.toISOString();

  for (const metric of metrics) {
    switch (metric) {
      case 'pa':
        series.push({
          metric: 'pa',
          label: 'Pressão arterial',
          unit: 'mmHg',
          goal: { systolic: GOALS.bloodPressureSystolic, diastolic: GOALS.bloodPressureDiastolic },
          points: asc
            .filter((v) => v.measurement?.bloodPressureSystolic != null && v.measurement?.bloodPressureDiastolic != null)
            .map((v) => ({ date: point(v), systolic: v.measurement!.bloodPressureSystolic, diastolic: v.measurement!.bloodPressureDiastolic })),
        });
        break;
      case 'glicemia':
        series.push({
          metric: 'glicemia',
          label: 'Glicemia capilar',
          unit: 'mg/dL',
          goal: GLYCEMIA_DISPLAY_GOAL,
          points: asc.filter((v) => v.measurement?.capillaryGlycemia != null).map((v) => ({ date: point(v), value: v.measurement!.capillaryGlycemia })),
        });
        break;
      case 'ldl':
        series.push({
          metric: 'ldl',
          label: 'Colesterol LDL',
          unit: 'mg/dL',
          goal: GOALS.ldl,
          points: asc.filter((v) => v.measurement?.ldl != null).map((v) => ({ date: point(v), value: v.measurement!.ldl })),
        });
        break;
      case 'hba1c':
        series.push({
          metric: 'hba1c',
          label: 'HbA1c',
          unit: '%',
          goal: GOALS.hba1c,
          points: asc.filter((v) => v.measurement?.hba1c != null).map((v) => ({ date: point(v), value: v.measurement!.hba1c })),
        });
        break;
      case 'peso':
        series.push({
          metric: 'peso',
          label: 'Peso',
          unit: 'kg',
          goal: 0,
          points: asc.filter((v) => v.measurement?.weight != null).map((v) => ({ date: point(v), value: v.measurement!.weight })),
        });
        break;
      default:
        // métrica desconhecida é ignorada silenciosamente
        break;
    }
  }
  return series;
}
