import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calcBmi } from '../src/domain/clinical/bmi.js';
import { latestControl } from '../src/domain/clinical/control.js';
import { classifyRisk } from '../src/domain/clinical/risk.js';
import { PERIODICITY_MONTHS } from '../src/domain/clinical/goals.js';
import { addMonths } from '../src/domain/clinical/priority.js';
import { cpfWithCheckDigits } from '../src/lib/cpf.js';
import type { RiskLevel } from '../src/domain/clinical/types.js';

const prisma = new PrismaClient();

const now = new Date();
function addDays(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const iso = (s: string) => new Date(`${s}T00:00:00Z`);

type Meas = Omit<Prisma.MeasurementCreateInput, 'visit' | 'id' | 'bmi'>;
interface VisitSpec {
  offsetDays: number; // relativo à data da visita mais recente do paciente (0 = a mais recente)
  measurement: Meas;
}
interface PatientSpec {
  identifierBase9: string;
  socialName: string;
  birthDate: string;
  biologicalSex: 'F' | 'M';
  smokingStatus: 'fumante' | 'ex_fumante' | 'nao_fumante';
  physicalActivity: 'nao_praticante' | 'raramente' | 'regularmente' | 'frequentemente';
  usesStatin: boolean;
  cardiovascularHistory: 'nao' | 'IAM' | 'AVC' | 'DAP' | 'outro';
  cardiovascularEventAt?: Date | null;
  daysUntilNextVisit: number; // D desejado para a ordenação (negativo = atrasado)
  intendedRisk: RiskLevel; // usado só para calcular a periodicidade e datar as visitas
  visits: VisitSpec[];
}

const patients: PatientSpec[] = [
  {
    identifierBase9: '111444777',
    socialName: 'Maria Silva',
    birthDate: '1968-03-12',
    biologicalSex: 'F',
    smokingStatus: 'ex_fumante',
    physicalActivity: 'raramente',
    usesStatin: true,
    cardiovascularHistory: 'IAM',
    cardiovascularEventAt: addMonths(now, -4), // evento recente (≤1 ano) → vermelho
    daysUntilNextVisit: -3,
    intendedRisk: 'vermelho',
    // Histórico rico para a tela de Evolução (valores do protótipo, do mais recente ao mais antigo).
    visits: [
      { offsetDays: 0, measurement: { weight: 72.5, height: 158, waistCircumference: 94, bloodPressureSystolic: 142, bloodPressureDiastolic: 88, capillaryGlycemia: 150, hba1c: 6.9, ldl: 160, hdl: 42, totalCholesterol: 240, triglycerides: 190 } },
      { offsetDays: -15, measurement: { bloodPressureSystolic: 146, bloodPressureDiastolic: 92, capillaryGlycemia: 168 } },
      { offsetDays: -43, measurement: { bloodPressureSystolic: 152, bloodPressureDiastolic: 96, capillaryGlycemia: 182, hba1c: 7.6, ldl: 178 } },
      { offsetDays: -58, measurement: { bloodPressureSystolic: 160, bloodPressureDiastolic: 100, capillaryGlycemia: 196, ldl: 188 } },
      { offsetDays: -102, measurement: { bloodPressureSystolic: 168, bloodPressureDiastolic: 104, capillaryGlycemia: 210, hba1c: 8.4, ldl: 196 } },
    ],
  },
  {
    identifierBase9: '222555888',
    socialName: 'José Nunes',
    birthDate: '1959-08-01',
    biologicalSex: 'M',
    smokingStatus: 'fumante',
    physicalActivity: 'nao_praticante',
    usesStatin: false,
    cardiovascularHistory: 'nao',
    daysUntilNextVisit: -1,
    intendedRisk: 'amarelo',
    visits: [
      { offsetDays: 0, measurement: { weight: 84, height: 172, bloodPressureSystolic: 132, bloodPressureDiastolic: 85, capillaryGlycemia: 138, hba1c: 6.5, ldl: 196, hdl: 38, totalCholesterol: 260 } },
      { offsetDays: -30, measurement: { bloodPressureSystolic: 134, bloodPressureDiastolic: 86, ldl: 188 } },
      { offsetDays: -75, measurement: { bloodPressureSystolic: 130, bloodPressureDiastolic: 84, hba1c: 6.7, ldl: 176 } },
    ],
  },
  {
    identifierBase9: '333666999',
    socialName: 'Tiago Feitosa',
    birthDate: '1965-11-23',
    biologicalSex: 'M',
    smokingStatus: 'fumante',
    physicalActivity: 'nao_praticante',
    usesStatin: true,
    cardiovascularHistory: 'DAP',
    cardiovascularEventAt: addMonths(now, -20), // antigo (>1 ano); vermelho vem de 3 fora da meta
    daysUntilNextVisit: 0,
    intendedRisk: 'vermelho',
    visits: [
      { offsetDays: 0, measurement: { weight: 91, height: 175, waistCircumference: 108, bloodPressureSystolic: 184, bloodPressureDiastolic: 121, heartRate: 88, capillaryGlycemia: 176, hba1c: 7.5, ldl: 150 } },
      { offsetDays: -28, measurement: { bloodPressureSystolic: 178, bloodPressureDiastolic: 116, hba1c: 7.8, ldl: 162 } },
    ],
  },
  {
    identifierBase9: '444777111',
    socialName: 'Lucas Cavalcante',
    birthDate: '1972-05-09',
    biologicalSex: 'M',
    smokingStatus: 'nao_fumante',
    physicalActivity: 'regularmente',
    usesStatin: false,
    cardiovascularHistory: 'nao',
    daysUntilNextVisit: 2,
    intendedRisk: 'amarelo',
    visits: [
      { offsetDays: 0, measurement: { weight: 78, height: 178, bloodPressureSystolic: 138, bloodPressureDiastolic: 86, capillaryGlycemia: 120, hba1c: 7.2, ldl: 118 } },
      { offsetDays: -35, measurement: { bloodPressureSystolic: 136, bloodPressureDiastolic: 84, hba1c: 7.4 } },
    ],
  },
  {
    identifierBase9: '555888222',
    socialName: 'Carla Nascimento',
    birthDate: '1977-02-18',
    biologicalSex: 'F',
    smokingStatus: 'nao_fumante',
    physicalActivity: 'frequentemente',
    usesStatin: false,
    cardiovascularHistory: 'nao',
    daysUntilNextVisit: 4,
    intendedRisk: 'verde',
    visits: [
      { offsetDays: 0, measurement: { weight: 63, height: 165, bloodPressureSystolic: 120, bloodPressureDiastolic: 78, capillaryGlycemia: 96, hba1c: 5.9, ldl: 110, hdl: 58 } },
      { offsetDays: -85, measurement: { bloodPressureSystolic: 122, bloodPressureDiastolic: 80, hba1c: 5.8, ldl: 108 } },
    ],
  },
  {
    identifierBase9: '666999333',
    socialName: 'Luana Torres',
    birthDate: '1985-09-30',
    biologicalSex: 'F',
    smokingStatus: 'nao_fumante',
    physicalActivity: 'regularmente',
    usesStatin: false,
    cardiovascularHistory: 'nao',
    daysUntilNextVisit: 5,
    intendedRisk: 'verde',
    visits: [
      { offsetDays: 0, measurement: { weight: 58, height: 162, bloodPressureSystolic: 118, bloodPressureDiastolic: 76, capillaryGlycemia: 90, hba1c: 5.5, ldl: 100 } },
    ],
  },
];

async function main() {
  // ---- Agente de Saúde (login) ----
  const passwordHash = await bcrypt.hash('cardio123', 10);
  const author = await prisma.user.upsert({
    where: { login: 'sandra.lima' },
    update: { name: 'Sandra Lima', passwordHash, teamId: 'Equipe 04' },
    create: { login: 'sandra.lima', name: 'Sandra Lima', passwordHash, teamId: 'Equipe 04' },
  });
  console.log(`AS: ${author.login} (senha: cardio123)`);

  for (const spec of patients) {
    const identifier = cpfWithCheckDigits(spec.identifierBase9);
    const period = PERIODICITY_MONTHS[spec.intendedRisk];
    // Data da visita mais recente tal que (mais recente + periodicidade) = hoje + D.
    const mostRecent = addMonths(addDays(now, spec.daysUntilNextVisit), -period);

    const patient = await prisma.patient.upsert({
      where: { identifier },
      update: {
        socialName: spec.socialName,
        birthDate: iso(spec.birthDate),
        biologicalSex: spec.biologicalSex,
        smokingStatus: spec.smokingStatus,
        physicalActivity: spec.physicalActivity,
        usesStatin: spec.usesStatin,
        cardiovascularHistory: spec.cardiovascularHistory,
        cardiovascularEventAt: spec.cardiovascularEventAt ?? null,
      },
      create: {
        identifier,
        socialName: spec.socialName,
        birthDate: iso(spec.birthDate),
        biologicalSex: spec.biologicalSex,
        smokingStatus: spec.smokingStatus,
        physicalActivity: spec.physicalActivity,
        usesStatin: spec.usesStatin,
        cardiovascularHistory: spec.cardiovascularHistory,
        cardiovascularEventAt: spec.cardiovascularEventAt ?? null,
      },
    });

    // Idempotência: recria as visitas do paciente a cada seed.
    await prisma.visit.deleteMany({ where: { patientId: patient.id } });

    const visitLikes = [];
    for (const v of spec.visits) {
      const collectedAt = addDays(mostRecent, v.offsetDays);
      const m = v.measurement;
      const bmi = calcBmi(m.weight ?? null, m.height ?? null);
      await prisma.visit.create({
        data: {
          patientId: patient.id,
          authorId: author.id,
          collectedAt,
          syncedAt: collectedAt,
          measurement: { create: { ...m, bmi } },
        },
      });
      visitLikes.push({ collectedAt, measurement: m });
    }

    // Deriva lastVisitAt e riskLevel a partir dos dados (fonte de verdade = domínio clínico).
    const lastVisitAt = mostRecent;
    const control = latestControl(visitLikes);
    const riskLevel = classifyRisk({
      control,
      cardiovascularHistory: spec.cardiovascularHistory,
      cardiovascularEventAt: spec.cardiovascularEventAt ?? null,
      now,
    });
    await prisma.patient.update({ where: { id: patient.id }, data: { lastVisitAt, riskLevel } });
    console.log(`Paciente: ${spec.socialName} · CPF ${identifier} · risco ${riskLevel}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
