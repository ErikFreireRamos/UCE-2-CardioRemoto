import { test, expect } from '@playwright/test';

/**
 * Reproduz o acesso pelo celular em `http://<IP-do-PC>:5173`: contexto INSEGURO, onde
 * `crypto.randomUUID` não existe. Antes do fallback, isso derrubava o seed do dataset local
 * (lista vazia) e a sincronização (que gera o id do dispositivo).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // `randomUUID` vive no protótipo — apagar em `crypto` seria um no-op silencioso.
    // @ts-expect-error — simula a ausência da API em contexto inseguro
    delete Crypto.prototype.randomUUID;
  });

  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'a.b.c', refreshToken: 'r1', user: { id: 'u1', login: 'sandra.lima', name: 'Sandra Lima' } }) }),
  );
  await page.route(
    (url) => url.pathname === '/sync',
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ syncedAt: new Date().toISOString(), synced: [], failed: [] }) }),
  );
  await page.route(
    (url) => url.pathname === '/sync/pull',
    (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ serverTime: new Date().toISOString(), patients: [], visits: [] }) }),
  );
});

test('sem crypto.randomUUID: o dataset local é populado e a lista aparece', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));

  await page.goto('/login');
  expect(await page.evaluate(() => 'randomUUID' in crypto)).toBe(false);

  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByRole('heading', { name: 'Pacientes' })).toBeVisible();

  // O sintoma era exatamente este: logava, mas nenhum paciente aparecia.
  await expect(page.getByText('Maria Silva')).toBeVisible();
  expect(erros).toEqual([]);
});

test('sem crypto.randomUUID: registrar visita e sincronizar funciona', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.getByText('Maria Silva').first().click();
  await page.getByRole('button', { name: /nova visita/i }).click();

  await page.getByLabel('LDL').fill('205');
  await page.getByRole('button', { name: /salvar visita/i }).click();

  await page.getByRole('button', { name: /sincronizar/i }).first().click();
  await page.getByRole('button', { name: /sincronizar agora/i }).click();

  // Antes do fallback, aqui aparecia "Falha na comunicação com o banco central".
  await expect(page.getByRole('button', { name: /conclu/i })).toBeVisible();
  await expect(page.getByText(/falha na comunicação/i)).toHaveCount(0);
});
