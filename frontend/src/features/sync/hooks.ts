import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../../data/db';
import { pendingCount } from '../../data/repo';
import { ApiError } from '../../api/errors';
import { useAuth } from '../auth/useAuth';
import { runSync } from './syncEngine';

/** Estado Online/Offline via navigator.onLine + eventos. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Contagem reativa de registros pendentes/falhados (via Dexie live query). */
export function usePendingCount(): number {
  return useLiveQuery(() => pendingCount(), [], 0) ?? 0;
}

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'partial' | 'offline' | 'error';

/** Hook da sincronização ATIVA (UC07): acionada pelo agente de saúde, com estado para a UI. */
export function useSync() {
  const online = useOnlineStatus();
  const pending = usePendingCount();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastResult, setLastResult] = useState<{ synced: number; failed: number } | null>(null);
  const lastSyncAt = useLiveQuery(() => getMeta('lastSyncAt'), [], undefined);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    try {
      const res = await runSync();
      setLastResult(res);
      setStatus(res.failed > 0 ? 'partial' : 'done');
    } catch (err) {
      // A UI mostra a mensagem do UC07; o erro real vai para o console, senão um defeito interno
      // fica indistinguível de uma falha de rede na hora de diagnosticar.
      console.error('Falha na sincronização', err);
      setStatus(err instanceof ApiError && err.isNetwork ? 'offline' : 'error');
    }
  }, []);

  return { status, online, pending, lastResult, lastSyncAt, syncNow, setStatus };
}

/**
 * Sincronização PASSIVA (RNF001) — precisa ficar montada globalmente, não dentro da folha de
 * sincronização. Dispara sozinha sempre que houver pendências e o dispositivo estiver online:
 *   - ao reconectar (mudança de `online`);
 *   - logo após salvar paciente/visita estando online (UC05 passo 4), pois `pending` muda.
 * `runSync` é serializada, então nunca concorre com a sincronização manual. Uma falha não entra
 * em laço: o efeito só roda de novo quando online/pendências mudam de fato.
 */
export function useAutoSync(): void {
  const online = useOnlineStatus();
  const pending = usePendingCount();
  const isAuthenticated = useAuth((s) => !!s.accessToken);

  useEffect(() => {
    if (!online || !isAuthenticated || pending === 0) return;
    void runSync().catch(() => {
      // Offline/falha de rede: os dados permanecem no dataset local para nova tentativa.
    });
  }, [online, pending, isAuthenticated]);
}
