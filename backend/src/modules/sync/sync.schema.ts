import { z } from 'zod';
import { measurementSchema } from '../visits/visits.schema.js';

/** Dados de paciente num registro de sync (id é a chave estável gerada no cliente). */
export const syncPatientData = z.object({
  identifier: z.string(),
  socialName: z.string(),
  birthDate: z.coerce.date(),
  biologicalSex: z.enum(['F', 'M']),
  smokingStatus: z.enum(['fumante', 'ex_fumante', 'nao_fumante']),
  physicalActivity: z.enum(['nao_praticante', 'raramente', 'regularmente', 'frequentemente']),
  usesStatin: z.boolean().default(false),
  cardiovascularHistory: z.enum(['nao', 'IAM', 'AVC', 'DAP', 'outro']).default('nao'),
  cardiovascularEventAt: z.coerce.date().optional().nullable(),
});

export const syncVisitData = z.object({
  patientId: z.string().uuid(),
  collectedAt: z.coerce.date(),
  authorId: z.string().uuid().optional(),
  measurement: measurementSchema,
});

export const syncRecordSchema = z.object({
  entity: z.enum(['patient', 'visit']),
  id: z.string().uuid('id deve ser UUID gerado no cliente'),
  updatedAt: z.coerce.date(),
  data: z.record(z.unknown()),
});
export type SyncRecord = z.infer<typeof syncRecordSchema>;

export const syncPushSchema = z.object({
  deviceId: z.string().min(1),
  records: z.array(syncRecordSchema),
});
export type SyncPushInput = z.infer<typeof syncPushSchema>;

export const syncPullQuerySchema = z.object({
  since: z.coerce.date().optional(),
});
