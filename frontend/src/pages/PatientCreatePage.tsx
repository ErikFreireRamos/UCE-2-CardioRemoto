import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../ui/tokens';
import { TealHeader, PrimaryButton, FieldLabel, InlineAlert } from '../ui/components';
import { Check } from '../ui/icons';
import { calcAge, type CardiovascularHistory } from '../clinical';
import { formatCpf, isValidCpf, normalizeCpf } from '../lib/cpf';
import { findPatientByIdentifier, putLocalPatient } from '../data/repo';
import { useToast } from '../features/ui/toast';

const histories: CardiovascularHistory[] = ['nao', 'IAM', 'AVC', 'DAP', 'outro'];
const historyLabel: Record<CardiovascularHistory, string> = { nao: 'Não', IAM: 'IAM', AVC: 'AVC', DAP: 'DAP', outro: 'Outro' };
const smokings = [['nao_fumante', 'Não fumante'], ['ex_fumante', 'Ex-fumante'], ['fumante', 'Fumante']] as const;
const activities = [['nao_praticante', 'Não pratic.'], ['raramente', 'Raramente'], ['regularmente', 'Regularmente'], ['frequentemente', 'Frequentemente']] as const;

export function PatientCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [sex, setSex] = useState<'F' | 'M'>('F');
  const [smoking, setSmoking] = useState<(typeof smokings)[number][0]>('nao_fumante');
  const [activity, setActivity] = useState<(typeof activities)[number][0]>('raramente');
  const [statin, setStatin] = useState(false);
  const [history, setHistory] = useState<CardiovascularHistory>('nao');
  const [eventAt, setEventAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ id: string; name: string } | null>(null);

  const atherosclerotic = history === 'IAM' || history === 'AVC' || history === 'DAP';
  const age = useMemo(() => (birth ? calcAge(`${birth}T00:00:00Z`) : null), [birth]);

  async function save() {
    setError(null);
    setDup(null);
    if (!isValidCpf(cpf)) return setError('CPF inválido.');
    if (!name.trim()) return setError('Informe o nome social.');
    if (!birth) return setError('Informe a data de nascimento.');
    if (atherosclerotic && !eventAt) return setError('Informe a data do evento cardiovascular (obrigatória para IAM/AVC/DAP).');

    const digits = normalizeCpf(cpf);
    const existing = await findPatientByIdentifier(digits);
    if (existing) {
      setDup({ id: existing.id, name: existing.socialName });
      return;
    }

    const p = await putLocalPatient({
      identifier: digits,
      socialName: name.trim(),
      birthDate: new Date(`${birth}T00:00:00Z`).toISOString(),
      biologicalSex: sex,
      smokingStatus: smoking,
      physicalActivity: activity,
      usesStatin: statin,
      cardiovascularHistory: history,
      cardiovascularEventAt: atherosclerotic ? new Date(`${eventAt}T00:00:00Z`).toISOString() : null,
    });
    toast('Paciente salvo no dataset local · pendente de sincronização');
    navigate(`/patients/${p.id}`, { replace: true });
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <TealHeader title="Novo paciente" onBack={() => navigate('/')} />
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div>
          <FieldLabel>CPF (identificação)</FieldLabel>
          <input value={formatCpf(cpf)} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" placeholder="000.000.000-00" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Nome social</FieldLabel>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do paciente" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Nascimento</FieldLabel>
            <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ width: 90 }}>
            <FieldLabel>Idade</FieldLabel>
            <div style={{ background: '#EDF3F0', border: '1.5px solid #D5E6DF', borderRadius: 12, padding: '13px 0', textAlign: 'center', fontSize: 15, fontWeight: 700, color: colors.teal }}>{age ?? '—'}</div>
          </div>
        </div>

        <Segmented label="Sexo biológico" value={sex} options={[['F', 'Feminino'], ['M', 'Masculino']]} onChange={setSex} />
        <Segmented label="Tabagismo" value={smoking} options={smokings} onChange={setSmoking} />
        <Segmented label="Atividade física" value={activity} options={activities} onChange={setActivity} wrap />
        <Segmented label="Uso de estatina" value={statin ? 'sim' : 'nao'} options={[['nao', 'Não'], ['sim', 'Sim']]} onChange={(v) => setStatin(v === 'sim')} />

        <div>
          <FieldLabel>Histórico de evento cardiovascular</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {histories.map((h) => (
              <button key={h} onClick={() => setHistory(h)} style={{ padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: history === h ? 700 : 600, minHeight: 0,
                background: history === h ? colors.teal : '#fff', color: history === h ? '#fff' : colors.textSoft, border: history === h ? 'none' : `1.5px solid ${colors.fieldBorder}` }}>
                {historyLabel[h]}
              </button>
            ))}
          </div>
        </div>
        {atherosclerotic && (
          <div>
            <FieldLabel>Data do evento (obrigatória)</FieldLabel>
            <input type="date" value={eventAt} onChange={(e) => setEventAt(e.target.value)} style={inputStyle} />
          </div>
        )}

        {error && <InlineAlert variant="red">{error}</InlineAlert>}
        {dup && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 10px 34px -16px rgba(80,60,40,.4)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>Paciente já cadastrado</div>
            <div style={{ fontSize: 12.5, color: colors.textSoft, marginTop: 2 }}>O CPF {formatCpf(cpf)} já pertence a <b>{dup.name}</b>.</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => navigate(`/patients/${dup.id}`)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: colors.teal, color: '#fff', fontSize: 13, fontWeight: 700 }}>Ver cadastro</button>
              <button onClick={() => setDup(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: colors.sand, color: colors.textSoft, fontSize: 13, fontWeight: 700 }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', padding: '12px 18px calc(22px + env(safe-area-inset-bottom))', background: `linear-gradient(transparent, ${colors.bg} 32%)` }}>
        <PrimaryButton onClick={save}><Check size={18} />Salvar paciente</PrimaryButton>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', background: '#fff', border: `1.5px solid ${colors.fieldBorder}`, borderRadius: 12, padding: '13px 14px', fontSize: 15, color: colors.text, outline: 'none' };

function Segmented<T extends string>({ label, value, options, onChange, wrap }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; wrap?: boolean }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: wrap ? 'wrap' : 'nowrap', background: colors.sand, borderRadius: 12, padding: 4, gap: 4 }}>
        {options.map(([val, lbl]) => (
          <button key={val} onClick={() => onChange(val)} style={{ flex: wrap ? '1 1 40%' : 1, textAlign: 'center', padding: '11px 4px', borderRadius: 9, fontSize: 13, fontWeight: value === val ? 700 : 600, minHeight: 0,
            background: value === val ? colors.teal : 'transparent', color: value === val ? '#fff' : colors.textSoft }}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
