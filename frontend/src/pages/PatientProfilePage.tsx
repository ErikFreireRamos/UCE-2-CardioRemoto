import { useNavigate, useParams } from 'react-router-dom';
import { colors, fonts, risk as riskColors } from '../ui/tokens';
import { Avatar, Card, PrimaryButton } from '../ui/components';
import { Back, Plus } from '../ui/icons';
import { usePatientProfile } from '../features/patients/selectors';
import { formatCpf } from '../lib/cpf';

const smokingLabel: Record<string, string> = { fumante: 'Fumante', ex_fumante: 'Ex-fumante', nao_fumante: 'Não fumante' };
const activityLabel: Record<string, string> = { nao_praticante: 'Não praticante', raramente: 'Raramente', regularmente: 'Regularmente', frequentemente: 'Frequentemente' };
const historyLabel: Record<string, string> = { nao: 'Não', IAM: 'IAM', AVC: 'AVC', DAP: 'DAP', outro: 'Outro' };

function GoalRow({ label, value, inGoal, first }: { label: string; value: string; inGoal: boolean | null; first?: boolean }) {
  const tone = inGoal === null ? { color: colors.textMuted, tag: '', bg: '' } : inGoal ? { color: '#1B7A3E', tag: 'na meta', bg: '#E6F4EA' } : { color: '#C7322B', tag: 'acima', bg: '#FBEDEC' };
  return (
    <>
      {!first && <div style={{ height: 1, background: colors.divider }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: colors.textSoft }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: tone.color }}>
          {value}{' '}
          {tone.tag && <span style={{ fontSize: 11, background: tone.bg, padding: '2px 7px', borderRadius: 6 }}>{tone.tag}</span>}
        </span>
      </div>
    </>
  );
}

export function PatientProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const profile = usePatientProfile(id);

  if (profile === undefined) return null;
  if (profile === null) return <div style={{ padding: 24 }}>Paciente não encontrado. <button onClick={() => navigate('/')}>Voltar</button></div>;

  const r = riskColors[profile.riskLevel];
  const cc = profile.currentControl;
  const f = profile.patient;

  return (
    <div>
      <div style={{ background: colors.teal, color: '#fff', padding: '18px 20px 20px', borderRadius: '0 0 26px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <button onClick={() => navigate('/')} aria-label="Voltar" style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Back size={19} /></button>
          <Avatar initials={profile.initials} riskKey={profile.riskLevel} size={50} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fonts.serif, fontSize: 23, fontWeight: 500, lineHeight: 1.05 }}>{profile.socialName}</div>
            <div style={{ fontSize: 12, color: colors.headerSub, marginTop: 2 }}>{profile.age} anos · {profile.biologicalSex === 'F' ? 'Feminino' : 'Masculino'} · CPF {formatCpf(profile.identifier)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: r.text }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: r.dot }} />{r.label}
          </span>
          <span style={{ background: 'rgba(255,255,255,.14)', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{profile.visitStatus}</span>
        </div>
      </div>

      <div style={{ padding: '16px 18px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Controle atual</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <GoalRow first label="Pressão arterial" value={cc.bloodPressure.value ?? '—'} inGoal={cc.bloodPressure.inGoal} />
            <GoalRow label="HbA1c" value={cc.hba1c.value != null ? `${cc.hba1c.value}%` : '—'} inGoal={cc.hba1c.inGoal} />
            <GoalRow label="LDL" value={cc.ldl.value != null ? String(cc.ldl.value) : '—'} inGoal={cc.ldl.inGoal} />
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Fatores de risco</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FactorRow label="Tabagismo" value={smokingLabel[f.smokingStatus] ?? '—'} />
            <FactorRow label="Atividade física" value={activityLabel[f.physicalActivity] ?? '—'} />
            <FactorRow label="Uso de estatina" value={f.usesStatin ? 'Sim' : 'Não'} />
            <FactorRow label="Evento CV" value={f.cardiovascularHistory === 'nao' ? 'Não' : `${historyLabel[f.cardiovascularHistory]}${f.cardiovascularEventAt ? ' · ' + new Date(f.cardiovascularEventAt).getUTCFullYear() : ''}`} strong={f.cardiovascularHistory !== 'nao'} />
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <PrimaryButton onClick={() => navigate(`/patients/${profile.id}/visits/new`)}><Plus size={17} />Nova visita</PrimaryButton>
          </div>
          <button onClick={() => navigate(`/patients/${profile.id}/evolution`)} style={{ flex: 1, background: colors.sand, color: colors.teal, borderRadius: 14, fontSize: 14, fontWeight: 700 }}>Ver evolução</button>
        </div>
      </div>
    </div>
  );
}

function FactorRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: colors.textSoft }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: strong ? '#C7322B' : colors.text }}>{value}</span>
    </div>
  );
}
