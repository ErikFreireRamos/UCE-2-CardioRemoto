/**
 * IMC = peso(kg) / altura(m)². Calculado sempre no servidor; nunca confiar no valor enviado.
 * Retorna `null` se peso ou altura ausentes/não positivos. Arredonda a 1 casa decimal.
 */
export function calcBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (weightKg == null || heightCm == null) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}
