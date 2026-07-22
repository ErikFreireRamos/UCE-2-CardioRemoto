import { describe, expect, it } from 'vitest';
import { calcBmi } from '../../../src/domain/clinical/bmi.js';

describe('calcBmi', () => {
  it('calcula IMC com 1 casa decimal', () => {
    expect(calcBmi(70, 175)).toBe(22.9);
    expect(calcBmi(80, 180)).toBe(24.7);
    expect(calcBmi(72.5, 158)).toBe(29); // ~29.04 → 29.0
  });

  it('retorna null quando peso ou altura estão ausentes', () => {
    expect(calcBmi(null, 175)).toBeNull();
    expect(calcBmi(70, null)).toBeNull();
    expect(calcBmi(undefined, undefined)).toBeNull();
  });

  it('retorna null para valores não positivos', () => {
    expect(calcBmi(70, 0)).toBeNull();
    expect(calcBmi(0, 175)).toBeNull();
    expect(calcBmi(-5, 175)).toBeNull();
  });
});
