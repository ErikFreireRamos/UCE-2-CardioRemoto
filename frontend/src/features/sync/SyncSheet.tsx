import { useLiveQuery } from 'dexie-react-hooks';
import { colors, fonts, risk as riskColors } from '../../ui/tokens';
import { BottomSheet, InlineAlert, PrimaryButton } from '../../ui/components';
import { SyncIcon } from '../../ui/icons';
import { db } from '../../data/db';
import { useSync } from './hooks';

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function SyncSheet({ onClose }: { onClose: () => void }) {
  const { status, online, pending, lastResult, lastSyncAt, syncNow } = useSync();

  const pendingItems = useLiveQuery(async () => {
    const [ps, vs] = await Promise.all([
      db.patients.where('syncState').anyOf('pending', 'failed').toArray(),
      db.visits.where('syncState').anyOf('pending', 'failed').toArray(),
    ]);
    const rows = [
      ...ps.map((p) => ({ id: p.id, title: p.socialName, sub: 'Cadastro', state: p.syncState, when: p.createdAt })),
      ...vs.map((v) => ({ id: v.id, title: 'Nova visita', sub: 'Visita', state: v.syncState, when: v.createdAt })),
    ];
    return rows.sort((a, b) => a.when.localeCompare(b.when));
  }, []) ?? [];

  const btn = {
    idle: { text: 'Sincronizar agora', bg: colors.coral },
    syncing: { text: 'Sincronizando…', bg: '#C9C0B2' },
    done: { text: 'Concluído ✓', bg: '#1B7A3E' },
    partial: { text: 'Concluído com pendências', bg: colors.coral },
    offline: { text: 'Sem conexão — tentar de novo', bg: colors.coral },
    error: { text: 'Falhou — tentar de novo', bg: colors.coral },
  }[status];

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: '#EDF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SyncIcon size={24} color={colors.teal} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fonts.serif, fontSize: 21, fontWeight: 600, color: colors.text }}>Sincronizar dados</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, marginTop: 2, color: online ? '#1B7A3E' : '#9A6B00' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#16A34A' : '#E6A100' }} />
            {online ? 'Online · conexão disponível' : 'Offline · sem conexão'}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: `1.5px solid ${colors.fieldBorder}`, borderRadius: 16, marginTop: 18, maxHeight: 240, overflowY: 'auto' }}>
        {pendingItems.length === 0 && (
          <div style={{ padding: 18, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>Nenhum registro pendente.</div>
        )}
        {pendingItems.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderBottom: i < pendingItems.length - 1 ? `1px solid ${colors.divider}` : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{r.title}</div>
              <div style={{ fontSize: 14, color: colors.textMuted }}>{r.sub} · {formatTime(r.when)}</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, padding: '3px 9px', borderRadius: 7, color: r.state === 'failed' ? riskColors.vermelho.text : '#9A6B00', background: r.state === 'failed' ? riskColors.vermelho.bg : '#FBF3DF' }}>
              {r.state === 'failed' ? 'falhou' : 'pendente'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 4px' }}>
        <span style={{ fontSize: 14, color: colors.textSoft }}>{pending} registro(s) pendente(s)</span>
        <span style={{ fontSize: 14, color: colors.textMuted }}>Última: {formatTime(lastSyncAt)}</span>
      </div>

      {status === 'offline' && (
        <div style={{ marginBottom: 12 }}>
          <InlineAlert variant="dark">Sem conexão. Os registros seguem salvos no aparelho e sincronizam ao reconectar.</InlineAlert>
        </div>
      )}
      {status === 'partial' && lastResult && (
        <div style={{ marginBottom: 12 }}>
          <InlineAlert variant="amber">{lastResult.synced} sincronizado(s), {lastResult.failed} mantido(s) localmente para nova tentativa.</InlineAlert>
        </div>
      )}
      {status === 'done' && lastResult && (
        <div style={{ marginBottom: 12 }}>
          <InlineAlert variant="info">
            {lastResult.synced} registro(s) sincronizado(s) às {formatTime(lastSyncAt)}.
          </InlineAlert>
        </div>
      )}
      {/* UC07 — fluxo de exceção "falha durante a sincronização". */}
      {status === 'error' && (
        <div style={{ marginBottom: 12 }}>
          <InlineAlert variant="red">
            Falha na comunicação com o banco central. Nenhum dado foi perdido: os registros
            permanecem armazenados localmente para nova tentativa.
          </InlineAlert>
        </div>
      )}

      <PrimaryButton onClick={syncNow} disabled={status === 'syncing'} color={btn.bg}>
        {btn.text}
      </PrimaryButton>
    </BottomSheet>
  );
}
