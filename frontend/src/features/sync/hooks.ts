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

/** Hook de sincronização: ativa (syncNow) + passiva (ao reconectar). */
export function useSync() {
  const online = useOnlineStatus();
  const pending = usePendingCount();
  const isAuthenticated = useAuth((s) => !!s.accessToken);
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
      setStatus(err instanceof ApiError && err.isNetwork ? 'offline' : 'error');
    }
  }, []);

  // Passiva: ao reconectar com pendentes, tenta sincronizar.
  useEffect(() => {
    if (online && isAuthenticated && pending > 0) {
      void syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return { status, online, pending, lastResult, lastSyncAt, syncNow, setStatus };
}
