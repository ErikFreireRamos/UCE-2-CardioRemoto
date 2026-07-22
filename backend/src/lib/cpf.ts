/** Utilidades de CPF: normalização e validação de dígitos verificadores. */

/** Remove tudo que não é dígito. */
export function normalizeCpf(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

/** Formata como 000.000.000-00 (assume 11 dígitos já normalizados). */
export function formatCpf(digits: string): string {
  const d = normalizeCpf(digits);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function checkDigit(base: string): number {
  const len = base.length + 1;
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    sum += Number(base[i]) * (len - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Valida CPF (11 dígitos, não todos iguais, dígitos verificadores corretos). */
export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais
  const d1 = checkDigit(cpf.slice(0, 9));
  const d2 = checkDigit(cpf.slice(0, 10));
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Gera os 2 dígitos verificadores para uma base de 9 dígitos (útil em seeds/testes). */
export function cpfWithCheckDigits(base9: string): string {
  const base = normalizeCpf(base9).slice(0, 9).padStart(9, '0');
  const d1 = checkDigit(base);
  const d2 = checkDigit(base + String(d1));
  return base + String(d1) + String(d2);
}
