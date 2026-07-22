import { ALERTS } from './goals.js';
import type { Alert, MeasurementInput } from './types.js';

/**
 * Alertas ao registrar visita (UC05 / RF005). São INFORMATIVOS — não bloqueiam o salvamento.
 *   Vermelho: PA ≥ 180/120 mmHg ou PA < 90/60 mmHg
 *   Vermelho: Glicemia ≥ 250 mg/dL ou < 70 mg/dL
 *   Amarelo:  LDL ≥ 190 mg/dL
 */
export function visitAlerts(m: MeasurementInput | null | undefined): Alert[] {
  const alerts: Alert[] = [];
  if (!m) return alerts;

  const sys = m.bloodPressureSystolic;
  const dia = m.bloodPressureDiastolic;
  const paHigh =
    (sys != null && sys >= ALERTS.paSystolicHigh) || (dia != null && dia >= ALERTS.paDiastolicHigh);
  const paLow =
    (sys != null && sys < ALERTS.paSystolicLow) || (dia != null && dia < ALERTS.paDiastolicLow);
  if (paHigh || paLow) {
    alerts.push({
      level: 'vermelho',
      field: 'bloodPressure',
      message: 'Alerta vermelho — PA fora da faixa segura (≥180/120 ou <90/60 mmHg)',
    });
  }

  const gly = m.capillaryGlycemia;
  if (gly != null && (gly >= ALERTS.glycemiaHigh || gly < ALERTS.glycemiaLow)) {
    alerts.push({
      level: 'vermelho',
      field: 'capillaryGlycemia',
      message: 'Alerta vermelho — glicemia ≥250 ou <70 mg/dL',
    });
  }

  const ldl = m.ldl;
  if (ldl != null && ldl >= ALERTS.ldlHigh) {
    alerts.push({
      level: 'amarelo',
      field: 'ldl',
      message: 'Alerta amarelo — LDL ≥190 mg/dL',
    });
  }

  return alerts;
}

/** Alerta mais grave (vermelho > amarelo). `null` se não houver. */
export function mostSevereAlert(alerts: readonly Alert[]): Alert | null {
  const red = alerts.find((a) => a.level === 'vermelho');
  if (red) return red;
  return alerts.find((a) => a.level === 'amarelo') ?? null;
}
