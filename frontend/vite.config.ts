/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg', 'icons/icon-maskable.svg'],
      manifest: {
        name: 'CardioRemoto',
        short_name: 'CardioRemoto',
        description: 'Monitoramento de pacientes cardiovasculares — Agentes de Saúde',
        theme_color: '#0F5750',
        background_color: '#FAF5EE',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // GETs da API: tenta a rede, cai no cache quando offline (o dataset local é a fonte primária).
            urlPattern: ({ url }) => url.pathname.startsWith('/patients') || url.pathname.startsWith('/sync'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 4 },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  // `strictPort`: se a 5173 estiver ocupada, falhar em vez de subir noutra porta — a origem do
  // dev server precisa bater com o `CORS_ORIGIN` do backend, senão o navegador bloqueia a API.
  server: { host: true, port: 5173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
