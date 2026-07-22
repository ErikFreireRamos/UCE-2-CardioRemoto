import { z } from 'zod';
import { isValidCpf } from '../../lib/cpf.js';

const atherosclerotic = ['IAM', 'AVC', 'DAP'] as const;

export const createPatientSchema = z
  .object({
    identifier: z.string().refine(isValidCpf, 'CPF inválido'),
    socialName: z.string().min(1, 'Nome social é obrigatório'),
    birthDate: z.coerce.date({ errorMap: () => ({ message: 'Data de nascimento inválida' }) }),
    biologicalSex: z.enum(['F', 'M']),
    smokingStatus: z.enum(['fumante', 'ex_fumante', 'nao_fumante']),
    physicalActivity: z.enum(['nao_praticante', 'raramente', 'regularmente', 'frequentemente']),
    usesStatin: z.boolean().default(false),
    cardiovascularHistory: z.enum(['nao', 'IAM', 'AVC', 'DAP', 'outro']).default('nao'),
    cardiovascularEventAt: z.coerce.date().optional().nullable(),
  })
  // Decisão #4: data do evento é obrigatória quando o histórico é aterosclerótico (IAM/AVC/DAP).
  .refine(
    (d) => !atherosclerotic.includes(d.cardiovascularHistory as (typeof atherosclerotic)[number]) || d.cardiovascularEventAt != null,
    { message: 'Informe a data do evento cardiovascular (obrigatória para IAM/AVC/DAP)', path: ['cardiovascularEventAt'] },
  );
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const listPatientsQuerySchema = z.object({
  risk: z.enum(['todos', 'verde', 'amarelo', 'vermelho', 'sem_dados']).default('todos'),
  sort: z.enum(['visitPriority', 'name']).default('visitPriority'),
  search: z.string().trim().optional(),
});
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

export const patientIdParamSchema = z.object({ id: z.string().uuid('id inválido') });
