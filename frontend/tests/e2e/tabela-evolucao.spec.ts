import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Login (backend mockado) → paciente com histórico → aba Tabela. */
async function abrirTabela(page: Page) {
  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'a.b.c', refreshToken: 'r1', user: { id: 'u1', login: 'sandra.lima', name: 'Sandra Lima' } }) }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.getByText('Maria Silva').first().click();
  await page.getByRole('button', { name: /ver evolução/i }).click();
  await page.getByRole('button', { name: 'Tabela' }).click();
  await page.getByRole('table').waitFor();
  return page.getByRole('region', { name: /rolagem horizontal/i });
}

test('a tabela rola com a roda do mouse, para a direita e para a esquerda', async ({ page }) => {
  const scroller = await abrirTabela(page);

  // Só faz sentido testar se o conteúdo de fato transborda.
  const transborda = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(transborda, 'a tabela precisa transbordar para o teste valer').toBe(true);
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);

  const box = (await scroller.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  // Roda do mouse emite apenas deltaY — é o caso que estava quebrado.
  await page.mouse.wheel(0, 400);
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

  const aposDireita = await scroller.evaluate((el) => el.scrollLeft);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeLessThan(aposDireita);
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
});

test('nas extremidades a roda volta a rolar a página (não prende o scroll)', async ({ page }) => {
  const scroller = await abrirTabela(page);
  const box = (await scroller.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  // Já está totalmente à esquerda: rolar "para trás" deve mover a página, não a tabela.
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
  await page.mouse.wheel(0, -600);
  expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
});

test('exporta a tabela como planilha CSV', async ({ page }) => {
  await abrirTabela(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /exportar planilha/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^evolucao-maria-silva-\d{4}-\d{2}-\d{2}\.csv$/);

  const conteudo = readFileSync(await download.path(), 'utf-8');
  expect(conteudo.charCodeAt(0)).toBe(0xfeff); // BOM: Excel abre com acentos corretos
  expect(conteudo).toContain('Paciente;Maria Silva');
  expect(conteudo).toContain('Medições vitais;Pressão arterial;mmHg;');
  expect(conteudo).toContain('Exames laboratoriais;Colesterol LDL;mg/dL;');
});
