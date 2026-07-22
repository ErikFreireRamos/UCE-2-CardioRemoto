import { describe, expect, it } from 'vitest';
import { mostSevereAlert, visitAlerts } from '../../../src/domain/clinical/alerts.js';

describe('visitAlerts', () => {
  it('PA ≥180/120 → vermelho', () => {
    const a = visitAlerts({ bloodPressureSystolic: 184, bloodPressureDiastolic: 121 });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ level: 'vermelho', field: 'bloodPressure' });
  });

  it('PA <90/60 → vermelho', () => {
    const a = visitAlerts({ bloodPressureSystolic: 88, bloodPressureDiastolic: 58 });
    expect(a[0]?.level).toBe('vermelho');
  });

  it('PA normal (139/89) → sem alerta', () => {
    expect(visitAlerts({ bloodPressureSystolic: 139, bloodPressureDiastolic: 89 })).toHaveLength(0);
  });

  it('glicemia ≥250 → vermelho; 69 → vermelho; 70 → sem alerta (limite não é <70)', () => {
    expect(visitAlerts({ capillaryGlycemia: 268 })[0]?.level).toBe('vermelho');
    expect(visitAlerts({ capillaryGlycemia: 69 })[0]?.level).toBe('vermelho');
    expect(visitAlerts({ capillaryGlycemia: 70 })).toHaveLength(0);
  });

  it('LDL ≥190 → amarelo; 189 → sem alerta', () => {
    expect(visitAlerts({ ldl: 196 })[0]).toMatchObject({ level: 'amarelo', field: 'ldl' });
    expect(visitAlerts({ ldl: 190 })[0]?.level).toBe('amarelo');
    expect(visitAlerts({ ldl: 189 })).toHaveLength(0);
  });

  it('medição vazia → sem alertas', () => {
    expect(visitAlerts({})).toHaveLength(0);
    expect(visitAlerts(null)).toHaveLength(0);
  });

  it('mostSevereAlert prioriza vermelho sobre amarelo', () => {
    const a = visitAlerts({ bloodPressureSystolic: 190, bloodPressureDiastolic: 100, ldl: 200 });
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(mostSevereAlert(a)?.level).toBe('vermelho');
    expect(mostSevereAlert([])).toBeNull();
  });
});
