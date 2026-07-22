import type { CardiovascularHistory, RiskLevel } from './types.js';

/**
 * Metas clínicas — "dentro da meta" quando o valor é ESTRITAMENTE MENOR que o limite.
 * (Documento de requisitos, seção UC03 / Observações)
 *   PA  < 140/90 mmHg
 *   HbA1c < 7%
 *   LDL < 130 mg/dL
 */
export const GOALS = {
  bloodPressureSystolic: 140,
  bloodPressureDiastolic: 90,
  hba1c: 7,
  ldl: 130,
} as const;

/**
 * Limiares de alerta ao registrar visita (UC05 / RF005). Informativos, não bloqueiam o salvamento.
 *   PA  ≥ 180/120 mmHg  ou  PA < 90/60 mmHg   → vermelho
 *   Glicemia ≥ 250 mg/dL  ou  < 70 mg/dL       → vermelho
 *   LDL ≥ 190 mg/dL                            → amarelo
 */
export const ALERTS = {
  paSystolicHigh: 180,
  paDiastolicHigh: 120,
  paSystolicLow: 90,
  paDiastolicLow: 60,
  glycemiaHigh: 250,
  glycemiaLow: 70,
  ldlHigh: 190,
} as const;

/** Eventos cardiovasculares ateroscleróticos (para as regras de risco). */
export const ATHEROSCLEROTIC: readonly CardiovascularHistory[] = ['IAM', 'AVC', 'DAP'];

/** Janela de "evento recente" = 1 ano. */
export const RECENT_EVENT_DAYS = 365;

/**
 * Periodicidade da próxima visita, em MESES de calendário, por nível de risco (UC04 / Observações):
 *   verde  → a cada 3 meses
 *   amarelo/vermelho → a cada 1 mês
 * "sem_dados" segue a cadência mais frequente por segurança (precisa de 1ª coleta).
 */
export const PERIODICITY_MONTHS: Record<RiskLevel, number> = {
  verde: 3,
  amarelo: 1,
  vermelho: 1,
  sem_dados: 1,
};

/** Meta usada apenas para o rótulo "na meta" da glicemia capilar na Evolução (não é parâmetro de risco). */
export const GLYCEMIA_DISPLAY_GOAL = 180;
