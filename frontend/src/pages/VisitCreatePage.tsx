import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, field as fieldTone } from '../ui/tokens';
import { TealHeader, PrimaryButton, InlineAlert } from '../ui/components';
import { Check } from '../ui/icons';
import { calcBmi, toNum, visitAlerts, type Measurements } from '../clinical';
import { usePatientProfile } from '../features/patients/selectors';
import { putLocalVisit } from '../data/repo';
import { useToast } from '../features/ui/toast';

type FormKey = keyof Measurements;
type Form = Partial<Record<FormKey, string>>;

const labs: { key: FormKey; label: string }[] = [
  { key: 'fastingGlucose', label: 'Glicose jejum' },
  { key: 'totalCholesterol', label: 'Colesterol total' },
  { key: 'hdl', label: 'HDL' },
  { key: 'triglycerides', label: 'Triglicérides' },
  { key: 'creatinine', label: 'Creatinina' },
  { key: 'urea', label: 'Ureia' },
  { key: 'tsh', label: 'TSH' },
  { key: 'tgo', label: 'TGO' },
  { key: 'tgp', label: 'TGP' },
  { key: 'cpk', label: 'CPK' },
  { key: 'albuminCreatinineRatio', label: 'Alb./creat.' },
];

export function VisitCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const profile = usePatientProfile(id);
  const [form, setForm] = useState<Form>({});
  const [showLabs, setShowLabs] = useState(false);
  const [triedEmpty, setTriedEmpty] = useState(false);

  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const measurements = useMemo<Measurements>(() => {
    const m: Measurements = {};
    (Object.keys(form) as FormKey[]).forEach((k) => { m[k] = toNum(form[k]); });
    return m;
  }, [form]);

  const bmi = calcBmi(measurements.weight, measurements.height);
  const alerts = useMemo(() => visitAlerts(measurements), [measurements]);
  const alertFields = new Set(alerts.flatMap((a) => (a.field === 'bloodPressure' ? ['bloodPressureSystolic', 'bloodPressureDiastolic'] : [a.field])));
  const canSave = (Object.keys(form) as FormKey[]).some((k) => (form[k] ?? '').trim() !== '');

  async function save() {
    if (!canSave) { setTriedEmpty(true); return; }
    if (!id) return;
    const clean: Measurements = {};
    (Object.keys(measurements) as FormKey[]).forEach((k) => { if (measurements[k] != null) clean[k] = measurements[k]; });
    if (bmi != null) clean.bmi = bmi;
    await putLocalVisit({ patientId: id, measurements: clean });
    toast('Visita salva localmente · pendente de sincronização');
    // Retorna à lista (fiel ao protótipo: salvar → toast → lista).
    navigate('/', { replace: true });
  }

  const alertVariant = (f: FormKey): 'normal' | 'red' | 'amber' => {
    if (f === 'ldl' && alertFields.has('ldl')) return 'amber';
    if (alertFields.has(f)) return 'red';
    return 'normal';
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <TealHeader title="Nova visita" subtitle={`${profile?.socialName ?? ''} · agora`} onBack={() => navigate(`/patients/${id}`)} rounded={26} />
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <Group title="Antropométricos">
          <Row>
            <NumField label="Peso (kg)" value={form.weight} onChange={set('weight')} />
            <NumField label="Altura (cm)" value={form.height} onChange={set('height')} />
          </Row>
          <Row>
            <div style={{ flex: 1 }}>
              <Lbl>IMC (auto)</Lbl>
              <div style={{ background: '#EDF3F0', border: '1.5px solid #D5E6DF', borderRadius: 10, padding: '11px 12px', fontSize: 15, fontWeight: 700, color: colors.teal }}>{bmi != null ? String(bmi).replace('.', ',') : '—'}</div>
            </div>
            <NumField label="Cintura (cm)" value={form.waistCircumference} onChange={set('waistCircumference')} />
          </Row>
        </Group>

        <Group title="Medições vitais">
          <Row>
            <NumField label="PA sistólica" value={form.bloodPressureSystolic} onChange={set('bloodPressureSystolic')} tone={alertVariant('bloodPressureSystolic')} />
            <NumField label="PA diastólica" value={form.bloodPressureDiastolic} onChange={set('bloodPressureDiastolic')} tone={alertVariant('bloodPressureDiastolic')} />
          </Row>
          {alertFields.has('bloodPressureSystolic') && <InlineAlert variant="red">Alerta vermelho — PA fora da faixa segura (≥180/120 ou &lt;90/60 mmHg)</InlineAlert>}
          <Row>
            <NumField label="Freq. cardíaca" value={form.heartRate} onChange={set('heartRate')} />
            <NumField label="Glicemia cap." value={form.capillaryGlycemia} onChange={set('capillaryGlycemia')} tone={alertVariant('capillaryGlycemia')} />
          </Row>
          {alertFields.has('capillaryGlycemia') && <InlineAlert variant="red">Alerta vermelho — glicemia ≥250 ou &lt;70 mg/dL</InlineAlert>}
        </Group>

        <Group title="Exames laboratoriais" right={<button onClick={() => setShowLabs((s) => !s)} style={{ fontSize: 14, fontWeight: 700, color: colors.teal, padding: '0 4px' }}>{showLabs ? 'Ver menos' : `Ver todos (${labs.length + 2})`}</button>}>
          <Row>
            <NumField label="LDL" value={form.ldl} onChange={set('ldl')} tone={alertVariant('ldl')} />
            <NumField label="HbA1c (%)" value={form.hba1c} onChange={set('hba1c')} />
          </Row>
          {alertFields.has('ldl') && <InlineAlert variant="amber">Alerta amarelo — LDL ≥190 mg/dL</InlineAlert>}
          {showLabs && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              {labs.map((l) => (
                <div key={l.key} style={{ flex: '1 1 44%' }}>
                  <NumField label={l.label} value={form[l.key]} onChange={set(l.key)} />
                </div>
              ))}
            </div>
          )}
        </Group>

        {triedEmpty && !canSave && <InlineAlert variant="red">Preencha ao menos um campo para registrar a visita.</InlineAlert>}
      </div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 480, margin: '0 auto', padding: '12px 18px calc(22px + env(safe-area-inset-bottom))', background: `linear-gradient(transparent, ${colors.bg} 32%)` }}>
        <PrimaryButton onClick={save} disabled={!canSave}><Check size={18} />Salvar visita</PrimaryButton>
      </div>
    </div>
  );
}

function Group({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 15, boxShadow: '0 4px 16px -10px rgba(80,60,40,.22)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10 }}>{children}</div>;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: colors.textMuted, marginBottom: 5 }}>{children}</div>;
}
function NumField({ label, value, onChange, tone = 'normal' }: { label: string; value?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; tone?: 'normal' | 'red' | 'amber' }) {
  const t = fieldTone[tone];
  return (
    <div style={{ flex: 1 }}>
      <Lbl>{label}</Lbl>
      <input aria-label={label} value={value ?? ''} onChange={onChange} inputMode="decimal" style={{ width: '100%', borderRadius: 10, padding: '11px 12px', fontSize: 15, fontWeight: tone === 'normal' ? 400 : 700, outline: 'none', background: t.bg, border: `1.5px solid ${t.border}`, color: t.color }} />
    </div>
  );
}
