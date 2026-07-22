import { describe, expect, it } from 'vitest';
import { calcAge } from '../../../src/domain/clinical/age.js';

describe('calcAge', () => {
  const now = new Date('2026-07-21T12:00:00Z');

  it('conta anos completos', () => {
    expect(calcAge('1968-01-10', now)).toBe(58);
    expect(calcAge('2000-07-21', now)).toBe(26); // aniversário é hoje → conta
  });

  it('não conta o ano quando o aniversário ainda não ocorreu', () => {
    expect(calcAge('2000-07-22', now)).toBe(25); // amanhã
    expect(calcAge('2000-12-31', now)).toBe(25);
  });

  it('trata nascidos em 29/02 sem quebrar', () => {
    expect(calcAge('2004-02-29', now)).toBe(22);
  });

  it('nunca retorna negativo', () => {
    expect(calcAge('2027-01-01', now)).toBe(0);
  });
});
