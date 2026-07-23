import type { CSSProperties, ReactNode } from 'react';
import { colors, fonts, radius, risk, shadow, type RiskKey } from './tokens';
import { AlertTriangle, Back } from './icons';

/** Coluna central mobile-first: full width no celular, no máx. 480px em telas maiores (RNF002). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: colors.bg, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

export function TealHeader({ title, subtitle, onBack, right, rounded = 28 }: { title: ReactNode; subtitle?: ReactNode; onBack?: () => void; right?: ReactNode; rounded?: number }) {
  return (
    <div style={{ background: colors.teal, color: '#fff', padding: '18px 20px 20px', borderRadius: `0 0 ${rounded}px ${rounded}px` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Voltar" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Back />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 500, lineHeight: 1.1 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 14, color: colors.headerSub, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

export function Card({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ background: colors.cardBg, borderRadius: radius.card, padding: 15, boxShadow: shadow.card, ...style }}>
      {children}
    </div>
  );
}

export function Avatar({ initials, riskKey = 'sem_dados', size = 46 }: { initials: string; riskKey?: RiskKey; size?: number }) {
  const r = risk[riskKey];
  return (
    <div style={{ width: size, height: size, borderRadius: radius.avatar, background: r.bg, color: r.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.serif, fontWeight: 600, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function RiskBadge({ riskKey }: { riskKey: RiskKey }) {
  const r = risk[riskKey];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: r.text }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: r.dot }} />
      {r.label}
    </span>
  );
}

export function VisitStatusBadge({ status, riskKey }: { status: string; riskKey: RiskKey }) {
  const overdue = status.includes('atrasado') || status === 'hoje';
  const bg = overdue ? risk[riskKey === 'sem_dados' ? 'vermelho' : riskKey].bg : colors.sand;
  const color = overdue ? risk[riskKey === 'sem_dados' ? 'vermelho' : riskKey].text : colors.textMuted;
  return <span style={{ fontSize: 14, fontWeight: 700, padding: '3px 9px', borderRadius: 7, color, background: bg }}>{status}</span>;
}

export function Chip({ active, children, onClick, dot }: { active: boolean; children: ReactNode; onClick: () => void; dot?: string }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: radius.chip, fontSize: 14,
      background: active ? '#fff' : 'rgba(255,255,255,.12)', color: active ? colors.teal : '#E6F2EF', fontWeight: active ? 700 : 600 }}>
      {dot && <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot }} />}
      {children}
    </button>
  );
}

type AlertVariant = 'red' | 'amber' | 'info' | 'dark';
export function InlineAlert({ variant, children }: { variant: AlertVariant; children: ReactNode }) {
  const map: Record<AlertVariant, { bg: string; border: string; color: string; icon: string }> = {
    red: { bg: '#FCF1F0', border: '#F2C9C4', color: '#9B2C24', icon: '#C7322B' },
    amber: { bg: '#FCF7EA', border: '#ECDCAE', color: '#806012', icon: '#C68A00' },
    info: { bg: '#EDF3F0', border: '#D5E6DF', color: colors.teal, icon: colors.teal },
    dark: { bg: colors.text, border: colors.text, color: '#fff', icon: '#FFB454' },
  };
  const s = map[variant];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '9px 12px' }}>
      <AlertTriangle color={s.icon} size={17} />
      <span style={{ fontSize: 14, fontWeight: 600, color: s.color }}>{children}</span>
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, color = colors.teal, type = 'button' }: { children: ReactNode; onClick?: () => void; disabled?: boolean; color?: string; type?: 'button' | 'submit' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 14, fontSize: 15, fontWeight: 700,
      background: disabled ? '#C9C0B2' : color, color: '#fff', opacity: 1 }}>
      {children}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.02em' }}>{children}</div>;
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="fade-in" style={{ position: 'fixed', left: 16, right: 16, bottom: 24, maxWidth: 448, margin: '0 auto', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, background: colors.text, color: '#fff', padding: '14px 16px', borderRadius: 14, boxShadow: '0 16px 30px -12px rgba(0,0,0,.5)' }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{message}</span>
    </div>
  );
}

export function BottomSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,35,30,.5)' }} />
      <div className="fade-in" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', background: colors.bg, borderRadius: '30px 30px 0 0', padding: '14px 22px 28px', boxShadow: shadow.sheet }}>
        <div style={{ width: 42, height: 5, borderRadius: 3, background: '#E2D8C8', margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  );
}
