import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../src/lib/uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Reproduz o contexto inseguro (http em IP da rede local): `randomUUID` não existe. */
function semRandomUUID() {
  const real = globalThis.crypto;
  vi.stubGlobal('crypto', {
    getRandomValues: real.getRandomValues.bind(real),
  });
}

describe('newId', () => {
  it('gera UUID v4 válido em contexto seguro', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('gera UUID v4 válido mesmo sem crypto.randomUUID (contexto inseguro)', () => {
    semRandomUUID();
    expect(globalThis.crypto.randomUUID).toBeUndefined();
    expect(newId()).toMatch(UUID_V4);
  });

  it('não repete ids no fallback', () => {
    semRandomUUID();
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
  });
});
