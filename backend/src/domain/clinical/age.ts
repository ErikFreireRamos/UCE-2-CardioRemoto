/**
 * Idade em anos completos, derivada da data de nascimento no momento da leitura.
 * `now` é injetável para testes determinísticos.
 *
 * Usa getters UTC para evitar variação por fuso horário: datas de nascimento são armazenadas
 * como "meia-noite UTC" (data pura), então comparar em UTC é estável em qualquer servidor.
 */
export function calcAge(birthDate: Date | string, now: Date = new Date()): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = now.getUTCDate() - birth.getUTCDate();
  // Ainda não fez aniversário este ano → subtrai 1.
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return Math.max(0, age);
}
