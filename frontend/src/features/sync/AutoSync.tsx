import { useAutoSync } from './hooks';

/**
 * Componente sem UI, montado em toda a aplicação autenticada, responsável pela forma PASSIVA
 * da sincronização (RNF001) e pelo envio automático logo após salvar uma visita (UC05 passo 4).
 */
export function AutoSync() {
  useAutoSync();
  return null;
}
