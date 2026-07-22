export function normalizeCpf(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

export function formatCpf(raw: string): string {
  const d = normalizeCpf(raw).slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)].filter(Boolean);
  let out = parts[0] ?? '';
  if (parts[1]) out += `.${parts[1]}`;
  if (parts[2]) out += `.${parts[2]}`;
  if (parts[3]) out += `-${parts[3]}`;
  return out;
}

function checkDigit(base: string): number {
  const len = base.length + 1;
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (len - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  return checkDigit(cpf.slice(0, 9)) === Number(cpf[9]) && checkDigit(cpf.slice(0, 10)) === Number(cpf[10]);
}
