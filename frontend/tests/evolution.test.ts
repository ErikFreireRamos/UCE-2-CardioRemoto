import { describe, expect, it } from 'vitest';
import { measurementKeys } from './helpers/measurementKeys';
import { METRICS, availableMetrics, buildSeries, metricInGoal, metricValue } from '../src/features/evolution/build';
import type { LocalVisit } from '../src/data/schema';
import type { Measurements } from '../src/clinical';

function visit(collectedAt: string, measurements: Measurements): LocalVisit {
  return { id: collectedAt, patientId: 'p1', collectedAt, measurements, createdAt: collectedAt, updatedAt: collectedAt, syncState: 'synced' };
}

describe('evolução (UC06)', () => {
  it('o catálogo cobre TODOS os dados coletáveis numa visita', () => {
    // `pa` agrega sistólica + diastólica; todos os demais campos têm métrica própria.
    const cobertos = new Set(METRICS.flatMap((m) => (m.key === 'pa' ? ['bloodPressureSystolic', 'bloodPressureDiastolic'] : [m.key])));
    for (const k of measurementKeys) expect(cobertos.has(k), `métrica ausente: ${k}`).toBe(true);
    expect(cobertos.size).toBe(measurementKeys.length);
  });

  it('só têm meta as métricas definidas no documento (PA, HbA1c, LDL) + glicemia de exibição', () => {
    const comMeta = METRICS.filter((m) => m.goal != null).map((m) => m.key).sort();
    expect(comMeta).toEqual(['capillaryGlycemia', 'hba1c', 'ldl', 'pa']);
  });

  it('availableMetrics lista apenas o que o paciente tem coletado', () => {
    const visits = [visit('2026-01-10T09:00:00Z', { weight: 70, ldl: 140 }), visit('2026-02-10T09:00:00Z', { tsh: 2.1 })];
    expect(availableMetrics(visits).map((m) => m.key).sort()).toEqual(['ldl', 'tsh', 'weight']);
  });

  it('buildSeries respeita a seleção do agente e ignora métricas sem dado', () => {
    const visits = [visit('2026-01-10T09:00:00Z', { ldl: 140, tgo: 30 }), visit('2026-02-10T09:00:00Z', { ldl: 120 })];

    expect(buildSeries(visits, ['ldl']).map((s) => s.metric)).toEqual(['ldl']);
    // A ordem segue o catálogo (documento), não a ordem de clique do agente.
    expect(buildSeries(visits, ['tgo', 'ldl']).map((s) => s.metric)).toEqual(['ldl', 'tgo']);
    // hdl nunca foi coletado → não vira série.
    expect(buildSeries(visits, ['hdl']).length).toBe(0);
    expect(buildSeries(visits, []).length).toBe(0);
  });

  it('a série usa o último valor coletado para o status de meta', () => {
    const visits = [visit('2026-01-10T09:00:00Z', { ldl: 190 }), visit('2026-02-10T09:00:00Z', { ldl: 100 })];
    const ldl = buildSeries(visits, ['ldl'])[0]!;
    expect(ldl.points.map((p) => p.y)).toEqual([190, 100]);
    expect(ldl.status).toBe('na-meta');
  });

  it('PA é exibida como par sistólica/diastólica e só está na meta com os dois abaixo', () => {
    expect(metricValue({ bloodPressureSystolic: 138, bloodPressureDiastolic: 88 }, 'pa')?.display).toBe('138/88');
    expect(metricValue({ bloodPressureSystolic: 138 }, 'pa')).toBeNull();
    expect(metricInGoal('pa', { bloodPressureSystolic: 138, bloodPressureDiastolic: 88 })).toBe(true);
    expect(metricInGoal('pa', { bloodPressureSystolic: 138, bloodPressureDiastolic: 92 })).toBe(false);
  });

  it('métrica sem meta documentada não é classificada como fora da meta', () => {
    expect(metricInGoal('tsh', { tsh: 12 })).toBeNull();
    expect(metricInGoal('ldl', { ldl: 140 })).toBe(false);
  });
});
