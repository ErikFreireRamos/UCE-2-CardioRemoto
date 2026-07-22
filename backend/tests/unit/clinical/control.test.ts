import { describe, expect, it } from 'vitest';
import { countOutOfGoal, latestControl } from '../../../src/domain/clinical/control.js';
import type { VisitLike } from '../../../src/domain/clinical/types.js';

describe('latestControl', () => {
  it('usa o último valor de cada métrica, mesmo vindo de visitas diferentes', () => {
    const visits: VisitLike[] = [
      { collectedAt: '2026-01-02', measurement: { bloodPressureSystolic: 168, bloodPressureDiastolic: 104, ldl: 196, hba1c: 8.4 } },
      { collectedAt: '2026-03-30', measurement: { bloodPressureSystolic: 146, bloodPressureDiastolic: 92 } }, // só PA
      { collectedAt: '2026-04-14', measurement: { ldl: 160, hba1c: 6.9 } }, // só labs
    ];
    const c = latestControl(visits);
    expect(c.bloodPressureSystolic).toBe(146); // da visita 30/03 (mais recente com PA)
    expect(c.bloodPressureDiastolic).toBe(92);
    expect(c.ldl).toBe(160); // da visita 14/04
    expect(c.hba1c).toBe(6.9);
  });

  it('deixa métrica nunca medida como null', () => {
    const visits: VisitLike[] = [{ collectedAt: '2026-04-14', measurement: { weight: 80 } }];
    const c = latestControl(visits);
    expect(c.bloodPressureSystolic).toBeNull();
    expect(c.hba1c).toBeNull();
    expect(c.ldl).toBeNull();
  });

  it('sem visitas → tudo null', () => {
    const c = latestControl([]);
    expect(c).toEqual({ bloodPressureSystolic: null, bloodPressureDiastolic: null, hba1c: null, ldl: null });
  });
});

describe('countOutOfGoal', () => {
  it('valores exatamente na meta (139/89, 6.9, 129) → 0 fora, 3 medidos', () => {
    const r = countOutOfGoal({ bloodPressureSystolic: 139, bloodPressureDiastolic: 89, hba1c: 6.9, ldl: 129 });
    expect(r).toEqual({ measured: 3, outOfGoal: 0 });
  });

  it('valores no limiar (140/90, 7.0, 130) → 3 fora (limite não é "na meta")', () => {
    const r = countOutOfGoal({ bloodPressureSystolic: 140, bloodPressureDiastolic: 90, hba1c: 7.0, ldl: 130 });
    expect(r).toEqual({ measured: 3, outOfGoal: 3 });
  });

  it('métricas ausentes não contam', () => {
    const r = countOutOfGoal({ bloodPressureSystolic: null, bloodPressureDiastolic: null, hba1c: null, ldl: 200 });
    expect(r).toEqual({ measured: 1, outOfGoal: 1 });
  });
});
