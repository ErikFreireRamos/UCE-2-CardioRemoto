import { test, expect } from '@playwright/test';

/**
 * Fluxo obrigatório: login → criar visita OFFLINE → reconectar → sincronizar.
 * A rede (login/sync) é mockada no boundary do Playwright para o teste ser autossuficiente.
 */
test('criar visita offline e depois sincronizar', async ({ page, context }) => {
  // Mock do login (backend).
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'a.b.c', refreshToken: 'r1', user: { id: 'u1', login: 'sandra.lima', name: 'Sandra Lima' } }),
    }),
  );

  await page.goto('/login');
  await page.getByRole('button', { name: /entrar/i }).click();

  // Lista de pacientes (dataset local semeado).
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();
  await page.getByText('Maria Silva').first().click();

  // Perfil → Nova visita.
  await page.getByRole('button', { name: /nova visita/i }).click();

  // Fica OFFLINE e cria a visita (offline-first: grava local).
  await context.setOffline(true);
  await page.getByLabel('LDL').fill('205');
  await page.getByRole('button', { name: /salvar visita/i }).click();

  // Voltou à lista; indicador de pendências aparece.
  await expect(page.getByText(/pendente/i).first()).toBeVisible();

  // Reconecta e sincroniza (mock do /sync retorna sucesso).
  await context.setOffline(false);
  await page.route('**/sync', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ syncedAt: new Date().toISOString(), synced: ['x'], failed: [] }) }),
  );
  await page.route('**/sync/pull**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ serverTime: new Date().toISOString(), patients: [], visits: [] }) }),
  );

  await page.getByRole('button', { name: /sincronizar/i }).first().click();
  await page.getByRole('button', { name: /sincronizar agora/i }).click();

  await expect(page.getByRole('button', { name: /conclu/i })).toBeVisible();
});
