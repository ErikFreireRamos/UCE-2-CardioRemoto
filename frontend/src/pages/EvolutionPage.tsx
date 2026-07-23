import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, fonts } from '../ui/tokens';
import { Back, Download } from '../ui/icons';
import { Sparkline } from '../ui/Sparkline';
import { useHorizontalScroll } from '../ui/useHorizontalScroll';
import { useToast } from '../features/ui/toast';
import { usePatientProfile, usePatientVisits } from '../features/patients/selectors';
import { availableMetrics, buildSeries, metricInGoal, metricValue, DEFAULT_METRICS } from '../features/evolution/build';
import { buildEvolutionCsv, downloadCsv, evolutionFileName } from '../features/evolution/export';
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
  const [selected, setSelected] = useState<string[]>([...DEFAULT_METRICS]);

  // Só entram na seleção as métricas que o paciente realmente possui coletadas.
  const available = useMemo(() => availableMetrics(visits), [visits]);
  const active = useMemo(() => selected.filter((k) => available.some((m) => m.key === k)), [selected, available]);
  const series = useMemo(() => buildSeries(visits, active), [visits, active]);
  const dates = useMemo(() => [...visits].sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()), [visits]);

  const toggle = (key: string) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  return (
    <div>
      <div style={{ background: colors.teal, color: '#fff', padding: '18px 20px 16px', borderRadius: '0 0 26px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(`/patients/${id}`)} aria-label="Voltar" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Back size={19} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 500 }}>Evolução</div>
            <div style={{ fontSize: 14, color: colors.headerSub, marginTop: 2 }}>{profile?.socialName ?? ''} · {visits.length} registro(s)</div>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: 4, gap: 4, marginTop: 15 }}>
          {(['grafico', 'tabela'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 9, fontSize: 14, fontWeight: tab === t ? 700 : 600, background: tab === t ? '#fff' : 'transparent', color: tab === t ? colors.teal : '#D8F0EB' }}>
              {t === 'grafico' ? 'Gráfico' : 'Tabela'}
            </button>
          ))}
        </div>
      </div>

      {visits.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>Sem visitas registradas ainda.</div>}

      {tab === 'grafico' && visits.length > 0 && (
        <div style={{ padding: '14px 16px 22px', display: 'flex', flexDirection: 'column', gap: 11 }}>
          {/* UC06 passo 3: um ou mais dados podem ser selecionados para o gráfico. */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 4px 14px -10px rgba(80,60,40,.22)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Dados no gráfico</div>
            <div style={{ fontSize: 14, color: colors.textMuted, margin: '3px 0 10px' }}>Selecione um ou mais para comparar a evolução.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {available.map((m) => {
                const on = active.includes(m.key);
                return (
                  <button key={m.key} onClick={() => toggle(m.key)} aria-pressed={on} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 999, fontSize: 14, fontWeight: on ? 700 : 600,
                    background: on ? m.color : '#fff', color: on ? '#fff' : colors.textSoft, border: on ? 'none' : `1.5px solid ${colors.fieldBorder}` }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: on ? '#fff' : m.color }} />
                    {m.short}
                  </button>
                );
              })}
            </div>
          </div>

          {series.length === 0 && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
              Selecione ao menos um dado acima para exibir o gráfico.
            </div>
          )}
          {series.map((s) => <Sparkline key={s.metric} s={s} />)}
          {series.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', fontSize: 14, color: colors.textMuted, fontWeight: 700 }}>
              {dates.map((d, i) => (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2) ? <span key={d.id}>{fmtDay(d.collectedAt)}</span> : <span key={d.id} />))}
            </div>
          )}
        </div>
      )}

      {tab === 'tabela' && visits.length > 0 && (
        <EvolutionTable visits={visits} socialName={profile?.socialName ?? ''} identifier={profile?.identifier ?? ''} />
      )}
    </div>
  );
}

/**
 * Tabela de evolução (UC06 passo 2): TODOS os dados coletados, por data. Cada coluna é uma data
 * de coleta (mais recente à esquerda) e cada linha um dado — o eixo mais longo fica na vertical,
 * o que evita rolagem horizontal da página no celular (RNF002); a rolagem lateral, quando há
 * muitas visitas, acontece dentro do próprio quadro da tabela.
 */
function EvolutionTable({ visits, socialName, identifier }: { visits: LocalVisit[]; socialName: string; identifier: string }) {
  const cols = [...visits].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  const rows = availableMetrics(visits);
  const scroller = useHorizontalScroll<HTMLDivElement>();
  const toast = useToast();
  let lastGroup = '';

  function exportar() {
    const now = new Date();
    downloadCsv(evolutionFileName(socialName, now), buildEvolutionCsv({ socialName, identifier, visits, now }));
    toast('Planilha exportada · verifique os downloads');
  }

  return (
    <div style={{ padding: '14px 16px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: colors.textMuted, fontWeight: 600 }}>{rows.length} dado(s) · {cols.length} visita(s)</span>
        <button onClick={exportar} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 12, background: colors.sand, color: colors.teal, fontSize: 14, fontWeight: 700 }}>
          <Download size={17} />Exportar planilha
        </button>
      </div>
      <div
        ref={scroller}
        className="hscroll"
        tabIndex={0}
        role="region"
        aria-label="Tabela de evolução — rolagem horizontal"
        style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px -10px rgba(80,60,40,.22)' }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 120 + cols.length * 86 }}>
          <thead>
            <tr style={{ background: '#EDF3F0', color: colors.teal }}>
              <th style={{ ...headCell, position: 'sticky', left: 0, background: '#EDF3F0', textAlign: 'left', width: 120, minWidth: 120 }}>DADO</th>
              {cols.map((v) => (
                <th key={v.id} style={{ ...headCell, minWidth: 86 }}>{fmtDay(v.collectedAt)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((def) => {
              const groupHeader = def.group !== lastGroup ? def.group : null;
              lastGroup = def.group;
              return (
                <Fragment key={def.key}>
                  {groupHeader && (
                    <tr>
                      <td colSpan={cols.length + 1} style={{ padding: '9px 12px', fontSize: 14, fontWeight: 800, color: colors.textMuted, background: colors.bg, borderTop: `1px solid ${colors.divider}` }}>
                        {groupHeader}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderTop: `1px solid ${colors.divider}` }}>
                    <th scope="row" style={{ ...bodyCell, position: 'sticky', left: 0, background: '#fff', textAlign: 'left', fontWeight: 700, color: colors.text, width: 120, minWidth: 120 }}>
                      {def.short}
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: colors.textMuted }}>{def.unit}</span>
                    </th>
                    {cols.map((v) => {
                      const value = metricValue(v.measurements, def.key);
                      const inGoal = metricInGoal(def.key, v.measurements);
                      const color = value == null ? colors.textMuted : inGoal == null ? colors.text : inGoal ? '#1B7A3E' : '#C7322B';
                      return (
                        <td key={v.id} style={{ ...bodyCell, color, fontWeight: value == null ? 400 : 700 }}>
                          {value?.display ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14, padding: '0 4px' }}>
        {[['#1B7A3E', 'na meta'], ['#C7322B', 'fora da meta'], [colors.text, 'sem meta definida']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: colors.textSoft, fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
        ))}
        <span style={{ fontSize: 14, color: colors.textSoft, fontWeight: 600 }}>— sem coleta</span>
      </div>
    </div>
  );
}

const headCell: React.CSSProperties = { padding: '11px 10px', fontSize: 14, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' };
const bodyCell: React.CSSProperties = { padding: '11px 10px', fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap' };
