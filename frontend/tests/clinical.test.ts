import { describe, expect, it } from 'vitest';
import {
  calcBmi,
  calcAge,
  classifyRisk,
  latestControl,
  visitAlerts,
  visitStatus,
  visitPriorityKey,
  type VisitLike,
} from '../src/clinical';

const now = new Date('2026-07-21T00:00:00Z');

describe('clínico (cliente)', () => {
  it('IMC e idade', () => {
    expect(calcBmi(70, 175)).toBe(22.9);
    expect(calcBmi(70, 0)).toBeNull();
    expect(calcAge('2000-07-21', now)).toBe(26);
    expect(calcAge('2000-07-22', now)).toBe(25);
  });

  it('latestControl usa o último valor por métrica', () => {
    const visits: VisitLike[] = [
      { collectedAt: '2026-01-01', measurements: { ldl: 200, hba1c: 8 } },
      { collectedAt: '2026-04-01', measurements: { bloodPressureSystolic: 130, bloodPressureDiastolic: 85 } },
      { collectedAt: '2026-06-01', measurements: { ldl: 120 } },
    ];
    const c = latestControl(visits);
    expect(c.ldl).toBe(120);
    expect(c.hba1c).toBe(8);
    expect(c.bloodPressureSystolic).toBe(130);
  });

  it('classifyRisk: sem dados, verde, amarelo, vermelho', () => {
    expect(classifyRisk({ bloodPressureSystolic: null, bloodPressureDiastolic: null, hba1c: null, ldl: null }, 'nao', null, now)).toBe('sem_dados');
    expect(classifyRisk({ bloodPressureSystolic: 120, bloodPressureDiastolic: 78, hba1c: 6, ldl: 100 }, 'nao', null, now)).toBe('verde');
    expect(classifyRisk({ bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 6, ldl: 100 }, 'nao', null, now)).toBe('amarelo');
    expect(classifyRisk({ bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 8, ldl: 200 }, 'nao', null, now)).toBe('vermelho');
    expect(classifyRisk({ bloodPressureSystolic: 120, bloodPressureDiastolic: 78, hba1c: 6, ldl: 100 }, 'IAM', '2026-05-01', now)).toBe('vermelho');
  });

  it('alertas em tempo real nos limiares', () => {
    expect(visitAlerts({ bloodPressureSystolic: 184, bloodPressureDiastolic: 121 })[0]?.level).toBe('vermelho');
    expect(visitAlerts({ capillaryGlycemia: 70 })).toHaveLength(0);
    expect(visitAlerts({ ldl: 190 })[0]?.level).toBe('amarelo');
    expect(visitAlerts({ ldl: 189 })).toHaveLength(0);
  });

  it('prioridade: sem visita no topo; rótulos de status', () => {
    expect(visitPriorityKey(null, 'sem_dados', now)).toBe(Number.NEGATIVE_INFINITY);
    expect(visitStatus(null, 'sem_dados', now)).toBe('1ª visita pendente');
    expect(visitStatus('2026-06-20', 'vermelho', now)).toBe('1 dia atrasado');
    expect(visitStatus('2026-06-23', 'vermelho', now)).toBe('2 dias para visita');
  });
});
