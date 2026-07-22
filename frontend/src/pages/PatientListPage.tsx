import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, fonts, risk as riskColors, shadow } from '../ui/tokens';
import { Avatar, Chip, InlineAlert, RiskBadge, VisitStatusBadge } from '../ui/components';
import { Plus, SyncIcon } from '../ui/icons';
import { usePatientList, type RiskFilter } from '../features/patients/selectors';
import { useAuth } from '../features/auth/useAuth';
import { SyncSheet } from '../features/sync/SyncSheet';
import { usePendingCount } from '../features/sync/hooks';

const filters: { key: RiskFilter; label: string; dot?: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'verde', label: 'Verde', dot: riskColors.verde.dot },
  { key: 'amarelo', label: 'Amarelo', dot: riskColors.amarelo.dot },
  { key: 'vermelho', label: 'Verm.', dot: riskColors.vermelho.dot },
];

export function PatientListPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [filter, setFilter] = useState<RiskFilter>('todos');
  const [search, setSearch] = useState('');
  const [syncOpen, setSyncOpen] = useState(false);
  const pending = usePendingCount();
  const items = usePatientList(filter, search);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ background: colors.teal, color: '#fff', padding: '18px 20px 20px', borderRadius: '0 0 28px 28px', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: fonts.serif, fontSize: 29, fontWeight: 500 }}>Pacientes</h1>
            <div style={{ fontSize: 13, color: colors.headerSub, fontWeight: 500, marginTop: 2 }}>
              {user?.name ?? 'Agente'} · ACS
            </div>
          </div>
          <button onClick={() => setSyncOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', color: '#C8EBE4', padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, minHeight: 0 }}>
            <SyncIcon size={15} color="#C8EBE4" />
            Sincronizar{pending > 0 ? ` (${pending})` : ''}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)} dot={f.dot}>{f.label}</Chip>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 18px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1.5px solid ${colors.fieldBorder}`, borderRadius: 13, padding: '11px 14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9A8C7C" strokeWidth="1.8" /><path d="M20 20l-3.5-3.5" stroke="#9A8C7C" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: colors.text }} />
        </div>
      </div>
      <div style={{ padding: '12px 22px 8px', fontSize: 12, fontWeight: 600, color: colors.textMuted }}>
        {items?.length ?? 0} · ordenado por <span style={{ color: colors.teal, fontWeight: 700 }}>prioridade de visita</span>
      </div>

      <div style={{ padding: '0 18px 96px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {items?.map((p) => (
          <div key={p.id} onClick={() => navigate(`/patients/${p.id}`)} style={{ background: '#fff', borderRadius: 18, padding: 15, boxShadow: shadow.card, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <Avatar initials={p.initials} riskKey={p.riskLevel} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fonts.serif, fontSize: 19, fontWeight: 600, color: colors.text }}>{p.socialName}</div>
                <div style={{ fontSize: 12.5, color: colors.textMuted, fontWeight: 500 }}>{p.age} anos · {p.biologicalSex === 'F' ? 'Feminino' : 'Masculino'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <RiskBadge riskKey={p.riskLevel} />
                <VisitStatusBadge status={p.visitStatus} riskKey={p.riskLevel} />
              </div>
            </div>
            {p.activeAlert ? (
              <div style={{ marginTop: 12 }}>
                <InlineAlert variant={p.riskLevel === 'amarelo' ? 'amber' : 'red'}>{p.activeAlert}</InlineAlert>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p.id}/visits/new`); }} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 12, background: colors.teal, color: '#fff', fontSize: 13, fontWeight: 700 }}>+ Nova visita</button>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p.id}/evolution`); }} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 12, background: colors.sand, color: colors.teal, fontSize: 13, fontWeight: 700 }}>Evolução</button>
              </div>
            )}
          </div>
        ))}
        {items && items.length === 0 && (
          <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, padding: '30px 0' }}>Nenhum paciente encontrado.</div>
        )}
      </div>

      <button onClick={() => navigate('/patients/new')} aria-label="Novo paciente" style={{ position: 'fixed', right: 'max(22px, calc(50vw - 218px))', bottom: 26, width: 60, height: 60, borderRadius: '50%', background: colors.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shadow.fab }}>
        <Plus size={26} />
      </button>

      {syncOpen && <SyncSheet onClose={() => setSyncOpen(false)} />}
    </div>
  );
}
