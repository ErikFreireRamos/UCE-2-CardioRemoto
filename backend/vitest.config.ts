import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Testes de integração compartilham o mesmo banco → sem paralelismo entre arquivos.
    fileParallelism: false,
    coverage: {
      include: ['src/domain/**'],
    },
  },
});
