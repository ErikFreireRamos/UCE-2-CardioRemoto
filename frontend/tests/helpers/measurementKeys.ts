import type { Measurements } from '../../src/clinical';

/**
 * Todos os dados de uma visita segundo o documento de requisitos (RF005 / UC05):
 * antropométricos, medições vitais e os 13 exames laboratoriais.
 * Tipado como `keyof Measurements` para quebrar a compilação se um campo for renomeado.
 */
export const measurementKeys: (keyof Measurements)[] = [
  // Antropométricos
  'weight',
  'height',
  'bmi',
  'waistCircumference',
  // Medições vitais
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'heartRate',
  'capillaryGlycemia',
  // Exames laboratoriais (13)
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
];
