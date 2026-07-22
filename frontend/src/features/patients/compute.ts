import { visitAlerts, type Alert, type VisitLike } from '../../clinical';

export {
  calcAge,
  classifyRisk,
  isHba1cInGoal,
  isLdlInGoal,
  isPaInGoal,
  latestControl,
  nextVisitDate,
  visitPriorityKey,
  visitStatus,
} from '../../clinical';
export type { RiskLevel } from '../../clinical';

/** Alerta mais grave da visita mais recente (para o cartão da lista). */
export function mostSevereAlertFromVisits(visits: VisitLike[]): Alert | null {
  const latest = [...visits].sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  )[0];
  if (!latest?.measurements) return null;
  const alerts = visitAlerts(latest.measurements);
  return alerts.find((a) => a.level === 'vermelho') ?? alerts.find((a) => a.level === 'amarelo') ?? null;
}
