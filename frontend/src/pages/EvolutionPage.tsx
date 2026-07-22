import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, fonts } from '../ui/tokens';
import { Back } from '../ui/icons';
import { Sparkline } from '../ui/Sparkline';
import { usePatientProfile, usePatientVisits } from '../features/patients/selectors';
import { buildSeries } from '../features/evolution/build';
import { GOALS, GLYCEMIA_DISPLAY_GOAL } from '../clinical';
import type { LocalVisit } from '../data/schema';

function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function EvolutionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const profile = usePatientProfile(id);
  const visits = usePatientVisits(id) ?? [];
  const [tab, setTab] = useState<'grafico' | 'tabela'>('grafico');

  const series = useMemo(() => buildSeries(visits), [visits]);
  const dates = useMemo(() => [...visits].sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()), [visits]);

  return (
    <div>
      <div style={{ background: colors.teal, color: '#fff', padding: '18px 20px 16px', borderRadius: '0 0 26px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(`/patients/${id}`)} aria-label="Voltar" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Back size={19} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>Evolução</div>
            <div style={{ fontSize: 12.5, color: colors.headerSub, marginTop: 2 }}>{profile?.socialName ?? ''} · {visits.length} registro(s)</div>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.12)', borderRadius: 11, padding: 4, gap: 4, marginTop: 15 }}>
          {(['grafico', 'tabela'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, fontSize: 13, minHeight: 0, fontWeight: tab === t ? 700 : 600, background: tab === t ? '#fff' : 'transparent', color: tab === t ? colors.teal : '#D8F0EB' }}>
              {t === 'grafico' ? 'Gráfico' : 'Tabela'}
            </button>
          ))}
        </div>
      </div>

      {visits.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>Sem visitas registradas ainda.</div>}

      {tab === 'grafico' && visits.length > 0 && (
        <div style={{ padding: '14px 16px 22px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {series.map((s) => <Sparkline key={s.metric} s={s} />)}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', fontSize: 10.5, color: colors.textMuted, fontWeight: 700 }}>
            {dates.map((d, i) => (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2) ? <span key={d.id}>{fmtDay(d.collectedAt)}</span> : <span key={d.id} />))}
          </div>
        </div>
      )}

      {tab === 'tabela' && visits.length > 0 && <EvolutionTable visits={visits} />}
    </div>
  );
}

const cell = (v: number | null | undefined, goal: number, lower = true) => {
  if (v == null) return { text: '—', color: colors.textSoft, weight: 400 as const };
  const ok = lower ? v < goal : v > goal;
  return { text: String(v).replace('.', ','), color: ok ? '#1B7A3E' : v >= goal * 1.15 ? '#C7322B' : '#9A6B00', weight: 700 as const };
};

function EvolutionTable({ visits }: { visits: LocalVisit[] }) {
  const rows = [...visits].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  return (
    <div style={{ padding: '14px 16px 22px' }}>
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px -10px rgba(80,60,40,.22)' }}>
        <div style={{ display: 'flex', background: '#EDF3F0', fontSize: 11, fontWeight: 800, color: colors.teal }}>
          <div style={{ width: 62, padding: '11px 12px', flexShrink: 0 }}>DATA</div>
          {['PA', 'GLIC', 'HbA1c', 'LDL'].map((h) => <div key={h} style={{ flex: 1, padding: '11px 4px', textAlign: 'center' }}>{h}</div>)}
        </div>
        {rows.map((v) => {
          const m = v.measurements;
          const pa = m.bloodPressureSystolic != null && m.bloodPressureDiastolic != null ? { text: `${m.bloodPressureSystolic}/${m.bloodPressureDiastolic}`, color: m.bloodPressureSystolic < GOALS.paSystolic && m.bloodPressureDiastolic < GOALS.paDiastolic ? '#1B7A3E' : '#C7322B', weight: 700 as const } : { text: '—', color: colors.textSoft, weight: 400 as const };
          const glic = cell(m.capillaryGlycemia, GLYCEMIA_DISPLAY_GOAL);
          const hba1c = cell(m.hba1c, GOALS.hba1c);
          const ldl = cell(m.ldl, GOALS.ldl);
          return (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, borderTop: `1px solid ${colors.divider}` }}>
              <div style={{ width: 62, padding: 12, flexShrink: 0, fontWeight: 700, color: colors.text }}>{fmtDay(v.collectedAt)}</div>
              {[pa, glic, hba1c, ldl].map((c, i) => <div key={i} style={{ flex: 1, padding: '12px 4px', textAlign: 'center', color: c.color, fontWeight: c.weight }}>{c.text}</div>)}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, padding: '0 4px' }}>
        {[['#C7322B', 'crítico'], ['#9A6B00', 'atenção'], ['#1B7A3E', 'na meta']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: colors.textSoft, fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
        ))}
        <span style={{ fontSize: 11.5, color: colors.textSoft, fontWeight: 600 }}>— sem coleta</span>
      </div>
    </div>
  );
}
