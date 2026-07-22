import { describe, expect, it } from 'vitest';
import { classifyRisk } from '../../../src/domain/clinical/risk.js';
import type { ControlSnapshot } from '../../../src/domain/clinical/types.js';

const now = new Date('2026-07-21T00:00:00Z');
const inGoal: ControlSnapshot = { bloodPressureSystolic: 120, bloodPressureDiastolic: 80, hba1c: 6.0, ldl: 100 };
const noData: ControlSnapshot = { bloodPressureSystolic: null, bloodPressureDiastolic: null, hba1c: null, ldl: null };

describe('classifyRisk', () => {
  it('sem nenhuma métrica medida → sem_dados', () => {
    expect(classifyRisk({ control: noData, cardiovascularHistory: 'nao', now })).toBe('sem_dados');
  });

  it('tudo na meta e sem histórico → verde', () => {
    expect(classifyRisk({ control: inGoal, cardiovascularHistory: 'nao', now })).toBe('verde');
  });

  it('1 ou 2 fora da meta e sem histórico aterosclerótico → amarelo', () => {
    const um: ControlSnapshot = { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 6.0, ldl: 100 };
    const dois: ControlSnapshot = { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 8.0, ldl: 100 };
    expect(classifyRisk({ control: um, cardiovascularHistory: 'nao', now })).toBe('amarelo');
    expect(classifyRisk({ control: dois, cardiovascularHistory: 'nao', now })).toBe('amarelo');
  });

  it('3 ou mais fora da meta → vermelho', () => {
    const tres: ControlSnapshot = { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 8.0, ldl: 200 };
    expect(classifyRisk({ control: tres, cardiovascularHistory: 'nao', now })).toBe('vermelho');
  });

  it('evento aterosclerótico recente (≤1 ano) força vermelho mesmo tudo na meta', () => {
    expect(
      classifyRisk({ control: inGoal, cardiovascularHistory: 'IAM', cardiovascularEventAt: '2026-05-01', now }),
    ).toBe('vermelho');
  });

  it('evento aterosclerótico antigo (>1 ano) + tudo na meta → verde', () => {
    expect(
      classifyRisk({ control: inGoal, cardiovascularHistory: 'IAM', cardiovascularEventAt: '2024-01-01', now }),
    ).toBe('verde');
  });

  it('histórico aterosclerótico antigo + 1 fora da meta → vermelho (regra conservadora da lacuna)', () => {
    const um: ControlSnapshot = { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 6.0, ldl: 100 };
    expect(
      classifyRisk({ control: um, cardiovascularHistory: 'AVC', cardiovascularEventAt: '2020-01-01', now }),
    ).toBe('vermelho');
  });

  it('histórico "outro" (não aterosclerótico) + 1 fora → amarelo', () => {
    const um: ControlSnapshot = { bloodPressureSystolic: 150, bloodPressureDiastolic: 95, hba1c: 6.0, ldl: 100 };
    expect(classifyRisk({ control: um, cardiovascularHistory: 'outro', now })).toBe('amarelo');
  });
});
