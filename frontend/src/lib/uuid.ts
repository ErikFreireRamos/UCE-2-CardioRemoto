/**
 * UUID v4 para as chaves geradas no cliente (idempotência do /sync).
 *
 * `crypto.randomUUID()` só é exposto em CONTEXTO SEGURO (https ou localhost). Ao testar no
 * celular por `http://<IP-do-PC>:5173` o contexto é inseguro e a função simplesmente não existe —
 * o que quebrava o seed do dataset local e a sincronização. `crypto.getRandomValues()`, por sua
 * vez, está disponível também em contexto inseguro, então montamos o v4 a partir dele.
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();

  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
