import { describe, expect, it } from 'vitest';
import {
  addMonths,
  nextVisitDate,
  sortByVisitPriority,
  visitPriorityKey,
  visitStatus,
} from '../../../src/domain/clinical/priority.js';
import type { RiskLevel } from '../../../src/domain/clinical/types.js';

const now = new Date('2026-07-21T00:00:00Z');
const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('addMonths', () => {
  it('soma meses preservando o dia', () => {
    expect(addMonths(d('2026-01-15'), 3).toISOString().slice(0, 10)).toBe('2026-04-15');
  });
  it('faz clamp no fim do mês', () => {
    expect(addMonths(d('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
  });
});

describe('nextVisitDate / visitStatus', () => {
  it('sem visita → 1ª visita pendente', () => {
    expect(nextVisitDate(null, 'sem_dados')).toBeNull();
    expect(visitStatus(null, 'sem_dados', now)).toBe('1ª visita pendente');
  });

  it('verde: última visita há ~100 dias (period. 3 meses) → atrasado', () => {
    // 2026-04-12 + 3 meses = 2026-07-12 → 9 dias atrasado em 21/07
    expect(visitStatus(d('2026-04-12'), 'verde', now)).toBe('9 dias atrasado');
  });

  it('vermelho: última visita há 31 dias (period. 1 mês) → 1 dia atrasado (singular)', () => {
    // 2026-06-20 + 1 mês = 2026-07-20 → 1 dia atrasado em 21/07
    expect(visitStatus(d('2026-06-20'), 'vermelho', now)).toBe('1 dia atrasado');
  });

  it('próxima visita hoje → "hoje"', () => {
    expect(visitStatus(d('2026-06-21'), 'vermelho', now)).toBe('hoje');
  });

  it('futuro → "N dias para visita"', () => {
    expect(visitStatus(d('2026-06-23'), 'vermelho', now)).toBe('2 dias para visita');
  });
});

describe('sortByVisitPriority', () => {
  it('sem-visita primeiro, depois atrasados (maior atraso), depois próximos', () => {
    type P = { id: string; lastVisitAt: Date | null; risk: RiskLevel };
    const items: P[] = [
      { id: 'futuro2', lastVisitAt: d('2026-06-25'), risk: 'vermelho' }, // +4 dias
      { id: 'novo', lastVisitAt: null, risk: 'sem_dados' }, // topo
      { id: 'atrasado3', lastVisitAt: d('2026-06-18'), risk: 'vermelho' }, // -3 dias
      { id: 'hoje', lastVisitAt: d('2026-06-21'), risk: 'vermelho' }, // 0
    ];
    const sorted = sortByVisitPriority(items, (p) => ({ lastVisitAt: p.lastVisitAt, risk: p.risk }), now);
    expect(sorted.map((p) => p.id)).toEqual(['novo', 'atrasado3', 'hoje', 'futuro2']);
  });

  it('paciente sem visita tem chave -Infinity', () => {
    expect(visitPriorityKey(null, 'sem_dados', now)).toBe(Number.NEGATIVE_INFINITY);
  });
});
