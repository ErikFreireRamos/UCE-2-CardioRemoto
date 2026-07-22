import { PERIODICITY_MONTHS } from './goals.js';
import type { RiskLevel } from './types.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Soma meses de calendário preservando o dia (clamp no fim do mês quando necessário).
 * Opera em UTC para ser estável em qualquer fuso do servidor.
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Se "estourou" o mês (ex.: 31/01 + 1 mês), volta para o último dia do mês alvo.
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** Diferença em dias inteiros de calendário (ignora horas), b - a, em UTC. */
export function diffDays(a: Date, b: Date): number {
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((db - da) / MS_PER_DAY);
}

/**
 * Data da próxima visita = "visita mais recente" + periodicidade do risco.
 * `null` quando o paciente ainda não tem nenhuma visita.
 */
export function nextVisitDate(lastVisitAt: Date | null, risk: RiskLevel): Date | null {
  if (!lastVisitAt) return null;
  return addMonths(lastVisitAt, PERIODICITY_MONTHS[risk]);
}

/** Dias até a próxima visita (negativo = atrasado). `null` se sem visita agendada. */
export function daysUntilVisit(next: Date | null, now: Date = new Date()): number | null {
  if (!next) return null;
  return diffDays(now, next);
}

function pluralDias(n: number): string {
  return n === 1 ? '1 dia' : `${n} dias`;
}

/**
 * Rótulo textual do status de visita (UC04):
 *   sem visita          → "1ª visita pendente"
 *   atrasado (dias < 0) → "N dias atrasado"
 *   hoje (dias === 0)   → "hoje"
 *   futuro (dias > 0)   → "N dias para visita"
 */
export function visitStatus(lastVisitAt: Date | null, risk: RiskLevel, now: Date = new Date()): string {
  if (!lastVisitAt) return '1ª visita pendente';
  const days = daysUntilVisit(nextVisitDate(lastVisitAt, risk), now)!;
  if (days < 0) return `${pluralDias(-days)} atrasado`;
  if (days === 0) return 'hoje';
  return `${pluralDias(days)} para visita`;
}

/**
 * Chave de ordenação por prioridade de visita (menor = mais prioritário).
 * Pacientes sem visita têm prioridade máxima (topo da lista) → -Infinity.
 * Caso contrário, usa os dias até a próxima visita (atrasados = negativos vêm primeiro).
 */
export function visitPriorityKey(lastVisitAt: Date | null, risk: RiskLevel, now: Date = new Date()): number {
  if (!lastVisitAt) return Number.NEGATIVE_INFINITY;
  return daysUntilVisit(nextVisitDate(lastVisitAt, risk), now)!;
}

/**
 * Ordena itens por prioridade de visita (ascendente por chave). Desempate estável opcional.
 */
export function sortByVisitPriority<T>(
  items: readonly T[],
  pick: (t: T) => { lastVisitAt: Date | null; risk: RiskLevel; tiebreaker?: string },
  now: Date = new Date(),
): T[] {
  return [...items].sort((a, b) => {
    const pa = pick(a);
    const pb = pick(b);
    const ka = visitPriorityKey(pa.lastVisitAt, pa.risk, now);
    const kb = visitPriorityKey(pb.lastVisitAt, pb.risk, now);
    if (ka !== kb) return ka - kb;
    return (pa.tiebreaker ?? '').localeCompare(pb.tiebreaker ?? '');
  });
}
