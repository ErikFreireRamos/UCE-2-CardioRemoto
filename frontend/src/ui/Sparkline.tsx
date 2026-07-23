import { colors } from './tokens';
import type { EvoSeries } from '../features/evolution/build';

/** Um mini-gráfico (small multiple) por métrica, com escala real e linha de meta. */
export function Sparkline({ s }: { s: EvoSeries }) {
  const W = 300, H = 124, padY = 14;
  const ys = s.points.map((p) => p.y);
  const goal = s.goalLine;
  const min = Math.min(...ys, ...(goal != null ? [goal] : []));
  const max = Math.max(...ys, ...(goal != null ? [goal] : []));
  const span = max - min || 1;
  const scaleY = (y: number) => padY + (H - 2 * padY) * (1 - (y - min) / span);
  const n = s.points.length;
  const scaleX = (i: number) => (n === 1 ? W / 2 : 24 + (W - 48) * (i / (n - 1)));

  const poly = s.points.map((p, i) => `${scaleX(i)},${scaleY(p.y).toFixed(1)}`).join(' ');
  const statusTone = s.status === 'na-meta' ? { color: '#1B7A3E', bg: '#E6F4EA', label: 'na meta' } : s.status === 'acima' ? { color: s.color, bg: `${s.color}1A`, label: 'acima da meta' } : { color: colors.textMuted, bg: '#EFEAE1', label: '' };

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 4px 14px -10px rgba(80,60,40,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{s.label}</span>
          </div>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 3 }}>{s.unit}{s.goalText ? ` · ${s.goalText}` : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: statusTone.color, lineHeight: 1 }}>{s.latest?.display ?? '—'}</div>
          {statusTone.label && <span style={{ display: 'inline-block', marginTop: 5, fontSize: 14, fontWeight: 700, color: statusTone.color, background: statusTone.bg, padding: '3px 8px', borderRadius: 6 }}>{statusTone.label}</span>}
        </div>
      </div>
      <svg width="100%" height="116" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 8 }}>
        {goal != null && <line x1="0" y1={scaleY(goal)} x2={W} y2={scaleY(goal)} stroke={`${s.color}66`} strokeWidth="1" strokeDasharray="4 4" />}
        <polyline points={poly} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {s.points.map((p, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(p.y)} r={i === n - 1 ? 3.7 : 3} fill={s.color} />
        ))}
      </svg>
    </div>
  );
}
