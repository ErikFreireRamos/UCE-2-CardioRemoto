import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, fonts } from '../ui/tokens';
import { HeartPulse, User, Lock } from '../ui/icons';
import { PrimaryButton } from '../ui/components';
import { authLogin } from '../api/endpoints';
import { ApiError } from '../api/errors';
import { useAuth } from '../features/auth/useAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [login, setLogin] = useState('sandra.lima');
  const [password, setPassword] = useState('cardio123');
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const locked = lockSeconds > 0;
  const mmss = `${String(Math.floor(lockSeconds / 60)).padStart(2, '0')}:${String(lockSeconds % 60).padStart(2, '0')}`;

  async function submit() {
    if (locked || loading) return;
    setError(null);
    setLoading(true);
    try {
      const tokens = await authLogin(login.trim(), password);
      setSession(tokens);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          const mins = Number(err.details?.minutesRemaining ?? 15);
          setLockSeconds(mins * 60);
          setError(err.message);
        } else if (err.isNetwork) {
          setError('Sem conexão com o servidor. Verifique a rede/URL da API.');
        } else {
          const rem = err.details?.attemptsRemaining;
          setError(rem != null ? `${err.message} · ${rem} tentativa(s) restante(s)` : err.message);
        }
      } else {
        setError('Falha ao entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.teal, color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeartPulse size={40} />
        </div>
        <div style={{ fontFamily: fonts.serif, fontSize: 34, fontWeight: 600, marginTop: 18 }}>CardioRemoto</div>
        <div style={{ fontSize: 13, color: '#A7D7CF', marginTop: 4, letterSpacing: '.04em' }}>Ecossistema mare.IA · HULW</div>
      </div>

      <div style={{ background: colors.bg, color: colors.text, borderRadius: '30px 30px 0 0', padding: '28px 24px calc(30px + env(safe-area-inset-bottom))', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        <h2 style={{ fontFamily: fonts.serif, fontSize: 22, fontWeight: 600 }}>Entrar</h2>
        <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 3 }}>Use suas credenciais da unidade.</div>

        {locked && (
          <div style={{ background: '#FCF1F0', borderRadius: 12, padding: 14, textAlign: 'center', marginTop: 16 }}>
            <Lock size={26} />
            <div style={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: 600, color: '#C7322B', marginTop: 6 }}>Acesso bloqueado</div>
            <div style={{ fontSize: 12.5, color: '#9B3A33', marginTop: 4 }}>Tente novamente em</div>
            <div style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 600, color: '#C7322B' }}>{mmss}</div>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <FieldWrap label="CPF / usuário">
            <User />
            <input value={login} onChange={(e) => setLogin(e.target.value)} disabled={locked} autoCapitalize="none" style={inputStyle} />
          </FieldWrap>
        </div>
        <div style={{ marginTop: 14 }}>
          <FieldWrap label="Senha">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={locked} onKeyDown={(e) => e.key === 'Enter' && submit()} style={inputStyle} />
          </FieldWrap>
        </div>

        {error && !locked && <div style={{ fontSize: 12.5, color: '#C7322B', marginTop: 12, fontWeight: 600 }}>{error}</div>}

        <div style={{ marginTop: 20 }}>
          <PrimaryButton onClick={submit} disabled={locked || loading}>{loading ? 'Entrando…' : 'Entrar'}</PrimaryButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5B8A52' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7C8F6F' }}>Funciona offline · dados no aparelho</span>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: colors.text };

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4A6B64', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `1.5px solid ${colors.fieldBorder}`, borderRadius: 13, padding: 14 }}>
        {children}
      </div>
    </div>
  );
}
