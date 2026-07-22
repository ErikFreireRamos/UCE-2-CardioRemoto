/**
 * Tipos do domínio clínico (puro, sem dependência de I/O ou Prisma).
 * Estes tipos são espelhados no frontend para dar feedback offline imediato.
 */

export type RiskLevel = 'verde' | 'amarelo' | 'vermelho' | 'sem_dados';

export type AlertLevel = 'vermelho' | 'amarelo';

export type CardiovascularHistory = 'nao' | 'IAM' | 'AVC' | 'DAP' | 'outro';

/** Campos de medição relevantes para as regras clínicas (subconjunto do Measurement completo). */
export interface MeasurementInput {
  // antropométricos
  weight?: number | null;
  height?: number | null;
  waistCircumference?: number | null;
  // vitais
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  capillaryGlycemia?: number | null;
  // laboratoriais (apenas os usados nas regras; os demais existem no schema)
  hba1c?: number | null;
  ldl?: number | null;
}

/** Uma visita "enxuta" o suficiente para os cálculos clínicos. */
export interface VisitLike {
  collectedAt: Date | string;
  measurement?: MeasurementInput | null;
}

/** Snapshot dos parâmetros de meta (últimos valores conhecidos por métrica). */
export interface ControlSnapshot {
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  hba1c: number | null;
  ldl: number | null;
}

export interface Alert {
  level: AlertLevel;
  field: string;
  message: string;
}
