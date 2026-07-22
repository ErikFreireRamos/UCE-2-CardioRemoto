import { useOnlineStatus, usePendingCount } from './hooks';
import { WifiOff } from '../../ui/icons';

/** Faixa fina de status: aparece quando offline ou há pendências (indicador sempre disponível). */
export function GlobalStatusBar() {
  const online = useOnlineStatus();
  const pending = usePendingCount();
  if (online && pending === 0) return null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700,
      background: online ? '#FBF3DF' : '#23170E', color: online ? '#9A6B00' : '#FFB454' }}>
      {!online && <WifiOff size={15} />}
      {online ? `${pending} registro(s) pendente(s) de sincronização` : `Offline · ${pending} registro(s) salvos no aparelho`}
    </div>
  );
}
