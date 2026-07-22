import { z } from 'zod';

/** Campos de medição (todos opcionais). `bmi` NÃO é aceito do cliente — é calculado no servidor. */
export const measurementFields = [
  'weight',
  'height',
  'waistCircumference',
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'heartRate',
  'capillaryGlycemia',
  'fastingGlucose',
  'hba1c',
  'totalCholesterol',
  'hdl',
  'ldl',
  'triglycerides',
  'creatinine',
  'urea',
  'tsh',
  'tgo',
  'tgp',
  'cpk',
  'albuminCreatinineRatio',
] as const;

const num = z.number().finite().nonnegative().optional().nullable();

export const measurementSchema = z.object({
  weight: num,
  height: num,
  waistCircumference: num,
  bloodPressureSystolic: num,
  bloodPressureDiastolic: num,
  heartRate: num,
  capillaryGlycemia: num,
  fastingGlucose: num,
  hba1c: num,
  totalCholesterol: num,
  hdl: num,
  ldl: num,
  triglycerides: num,
  creatinine: num,
  urea: num,
  tsh: num,
  tgo: num,
  tgp: num,
  cpk: num,
  albuminCreatinineRatio: num,
});
export type MeasurementBody = z.infer<typeof measurementSchema>;

export const createVisitSchema = z.object({
  collectedAt: z.coerce.date().optional(),
  measurement: measurementSchema,
});
export type CreateVisitInput = z.infer<typeof createVisitSchema>;

/** Ao menos um campo de medição deve estar preenchido (UC05 fluxo de exceção). */
export function hasAtLeastOneField(m: MeasurementBody): boolean {
  return measurementFields.some((f) => m[f] != null);
}

export const evolutionQuerySchema = z.object({
  metrics: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : ['pa', 'glicemia', 'ldl', 'hba1c', 'peso'])),
});
