import { countOutOfGoal } from './control.js';
import { ATHEROSCLEROTIC, RECENT_EVENT_DAYS } from './goals.js';
import type { CardiovascularHistory, ControlSnapshot, RiskLevel } from './types.js';

export interface RiskInput {
  control: ControlSnapshot;
  cardiovascularHistory: CardiovascularHistory;
  /** Data do evento CV (obrigatória no cadastro quando o histórico é aterosclerótico). */
  cardiovascularEventAt?: Date | string | null;
  now?: Date;
}

function isAtherosclerotic(history: CardiovascularHistory): boolean {
  return ATHEROSCLEROTIC.includes(history);
}

function isRecentEvent(eventAt: Date | string | null | undefined, now: Date): boolean {
  if (eventAt == null) return false;
  const t = (typeof eventAt === 'string' ? new Date(eventAt) : eventAt).getTime();
  const ageInDays = (now.getTime() - t) / (1000 * 60 * 60 * 24);
  return ageInDays <= RECENT_EVENT_DAYS;
}

/**
 * Classificação de risco (UC03), derivada dos dados mais recentes do paciente.
 *
 * Precedência (documentada):
 *   1. Nenhum parâmetro de meta medido            → sem_dados (neutro/cinza)
 *   2. Evento aterosclerótico recente (≤ 1 ano)    → vermelho
 *   3. ≥ 3 parâmetros fora da meta                 → vermelho
 *   4. Histórico aterosclerótico (mesmo não-recente) + ≥ 1 fora da meta → vermelho (conservador)
 *   5. 1–2 fora da meta e sem histórico aterosclerótico → amarelo
 *   6. Tudo na meta e sem evento recente           → verde
 *
 * Observações do documento:
 *   - Verde: parâmetros dentro da meta e sem eventos CV no último ano.
 *   - Amarelo: 1 ou 2 fora da meta e SEM histórico de evento CV aterosclerótico.
 *   - Vermelho: 3+ fora da meta OU evento recente (≤ 1 ano).
 * O passo 4 resolve conservadoramente a lacuna "histórico antigo + 1–2 fora" (não cabe em amarelo,
 * pois há histórico; nem se encaixa nas condições explícitas de vermelho): classificamos vermelho.
 */
export function classifyRisk(input: RiskInput): RiskLevel {
  const now = input.now ?? new Date();
  const { measured, outOfGoal } = countOutOfGoal(input.control);

  if (measured === 0) return 'sem_dados';

  const atherosclerotic = isAtherosclerotic(input.cardiovascularHistory);

  if (atherosclerotic && isRecentEvent(input.cardiovascularEventAt, now)) return 'vermelho';
  if (outOfGoal >= 3) return 'vermelho';
  if (atherosclerotic && outOfGoal >= 1) return 'vermelho';
  if (outOfGoal >= 1) return 'amarelo';
  return 'verde';
}
