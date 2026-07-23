import { test, expect, type Page } from '@playwright/test';

/**
 * RNF002 — interface responsiva, sem rolagem horizontal, nos breakpoints do documento;
 * textos com no mínimo 14px e áreas de toque de no mínimo 44×44px.
 */
const BREAKPOINTS = [
  { nome: 'mobile pequeno', width: 320, height: 640 },
  { nome: 'mobile pequeno (topo)', width: 480, height: 800 },
  { nome: 'mobile grande', width: 767, height: 900 },
  { nome: 'tablet', width: 1024, height: 900 },
];

/** Telas percorridas: lista → perfil → nova visita → evolução (gráfico e tabela) → cadastro. */
async function telas(page: Page): Promise<{ nome: string; abrir: () => Promise<void> }[]> {
  return [
    { nome: 'lista de pacientes', abrir: async () => { await page.goto('/'); await page.getByRole('heading', { name: 'Pacientes' }).waitFor(); } },
    { nome: 'perfil', abrir: async () => { await page.goto('/'); await page.getByText('Maria Silva').first().click(); await page.getByText('Controle atual').waitFor(); } },
    { nome: 'nova visita', abrir: async () => { await page.goto('/'); await page.getByText('Maria Silva').first().click(); await page.getByRole('button', { name: /nova visita/i }).click(); await page.getByText('Antropométricos').waitFor(); } },
    { nome: 'evolução (gráfico)', abrir: async () => { await page.goto('/'); await page.getByText('Maria Silva').first().click(); await page.getByRole('button', { name: /ver evolução/i }).click(); await page.getByText('Dados no gráfico').waitFor(); } },
    { nome: 'evolução (tabela)', abrir: async () => { await page.goto('/'); await page.getByText('Maria Silva').first().click(); await page.getByRole('button', { name: /ver evolução/i }).click(); await page.getByRole('button', { name: 'Tabela' }).click(); await page.getByRole('table').waitFor(); } },
    { nome: 'novo paciente', abrir: async () => { await page.goto('/patients/new'); await page.getByLabel('CPF (identificação)').waitFor(); } },
  ];
}

/** Textos visíveis com menos de 14px. */
async function textosPequenos(page: Page) {
  return page.evaluate(() => {
    const ruins: { texto: string; px: number }[] = [];
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const proprio = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);
      if (!proprio || !el.offsetParent) return;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 14) ruins.push({ texto: (el.textContent ?? '').trim().slice(0, 40), px });
    });
    return ruins;
  });
}

/** Controles interativos visíveis menores que 44×44px. */
async function toquesPequenos(page: Page) {
  return page.evaluate(() => {
    const ruins: { rotulo: string; w: number; h: number }[] = [];
    document.querySelectorAll<HTMLElement>('button, a, input[type="checkbox"], input[type="radio"], [role="button"]').forEach((el) => {
      if (!el.offsetParent) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.width < 44 || r.height < 44) ruins.push({ rotulo: (el.textContent ?? el.getAttribute('aria-label') ?? '?').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
    });
    return ruins;
  });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'a.b.c', refreshToken: 'r1', user: { id: 'u1', login: 'sandra.lima', name: 'Sandra Lima' } }) }),
  );
  // Casa pelo caminho, não por glob: um `**/sync**` capturaria também os módulos do Vite
  // servidos de `/src/features/sync/…`, e o app nem carregaria.
  await page.route(
    (url) => url.pathname === '/sync' || url.pathname === '/sync/pull',
    (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ syncedAt: new Date().toISOString(), synced: [], failed: [], serverTime: new Date().toISOString(), patients: [], visits: [] }) }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.getByRole('heading', { name: 'Pacientes' }).waitFor();
});

for (const bp of BREAKPOINTS) {
  test(`RNF002 — ${bp.nome} (${bp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });

    for (const tela of await telas(page)) {
      await tela.abrir();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `rolagem horizontal em "${tela.nome}"`).toBeLessThanOrEqual(0);

      expect(await textosPequenos(page), `texto <14px em "${tela.nome}"`).toEqual([]);
      expect(await toquesPequenos(page), `área de toque <44px em "${tela.nome}"`).toEqual([]);
    }
  });
}
