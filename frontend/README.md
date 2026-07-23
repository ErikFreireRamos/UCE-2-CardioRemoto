# CardioRemoto — Frontend (PWA mobile, offline-first)

Cliente mobile do **CardioRemoto** usado por Agentes de Saúde (AS) em campo. **Offline-first**:
coleta dados localmente (IndexedDB) e sincroniza com o backend quando há conexão. Instalável como
PWA.

**Stack:** React + TypeScript + Vite · Dexie (IndexedDB) · React Router · Zustand · Zod · vite-plugin-pwa · Vitest + Playwright.

---

## Rodar

```bash
cp .env.example .env      # ajuste VITE_API_URL (veja "Testar no celular")
npm install
npm run dev               # http://localhost:5173
```

Terminal 1
cd frontend
npm install
npm run dev

Terminal 2
cd backend
docker compose up --build

Login do seed do backend: **sandra.lima / cardio123**. O app já vem com um **dataset local semeado**
(6 pacientes), então funciona mesmo **sem o backend** — só o 1º login precisa da API online.

## Scripts

| Script                      | Ação                                             |
| --------------------------- | ------------------------------------------------ |
| `npm run dev`               | Dev server (Vite)                                |
| `npm run build` / `preview` | Build de produção / pré-visualização             |
| `npm test`                  | Vitest (clínico, offline/sync, componentes)      |
| `npm run test:e2e`          | Playwright: "criar visita offline → sincronizar" |

## Testar no celular (mesma rede Wi-Fi)

1. Suba o dev server acessível na rede: `npm run dev -- --host` → Vite expõe `http://<IP-do-PC>:5173`.
2. Abra esse endereço no navegador do celular (mesma Wi-Fi).
3. Aponte a API para o **IP do PC** no `.env`: `VITE_API_URL=http://192.168.x.x:3000` (**nunca**
   `localhost` — no celular, `localhost` é o próprio aparelho). Descubra o IP com `ipconfig`.
4. No backend, inclua essa origem no `CORS_ORIGIN` (ex.: `http://192.168.x.x:5173`).

### Instalar e testar offline (PWA)

O service worker/instalação exige **HTTPS** fora de `localhost`. Para testar no celular:

```bash
npm run build && npm run preview -- --host   # serve o build
# em outro terminal, exponha via túnel https:
npx cloudflared tunnel --url http://localhost:4173   # ou: ngrok http 4173
```

Abra a URL https no celular → **Adicionar à tela inicial**. Roteiro de validação offline:
**instalar → ativar modo avião → criar uma visita → reconectar → Sincronizar** (os dados
permanecem e são enviados).

## Arquitetura offline-first (RNF001)

- Toda entidade criada recebe **UUID local** + estado `pending | synced | failed`.
- **Escrita** grava no IndexedDB e enfileira no `outbox` **na mesma transação** (sem perda), refletindo
  na UI na hora (Dexie `useLiveQuery`) — sem spinner bloqueante.
- **Sincronização** (`src/features/sync/`): passiva (evento `online` com pendentes) + ativa (botão
  "Sincronizar agora"). Envia o lote a `POST /sync`; marca `synced`/mantém `failed` conforme o status
  parcial da API (nunca perde dados) e depois puxa mudanças com `GET /sync/pull?since=`.
- Indicador **Online/Offline + nº de pendentes** sempre visível (faixa global + botão da lista).

## Regras clínicas no cliente

`src/clinical/` espelha o backend (fonte de verdade) para feedback imediato offline: IMC automático,
idade, **alertas em tempo real** (PA ≥180/120 ou <90/60; glicemia ≥250 ou <70; LDL ≥190), rótulos
"na meta"/"acima" (PA<140/90, HbA1c<7, LDL<130), classificação de risco (incl. **sem_dados**) e
prioridade de visita (sem-visita no topo).

## Telas

Login (com bloqueio 5/15min) · Lista (chips de risco, busca, ordenação por prioridade) · Cadastro
(idade automática, data de evento CV obrigatória se aterosclerótico, CPF duplicado → "ver cadastro")
· Perfil (controle atual + fatores) · Nova visita (**todos os campos do documento**, IMC auto,
alertas em tempo real, ≥1 campo) · Evolução (**small multiples** SVG + tabela) · Sincronização
(bottom sheet, estados pendente→sincronizando→concluído/parcial/offline).

## RNF002 (responsivo)

Sem rolagem horizontal em 320–480 / 481–767 / 768–1024px; coluna central com máx. 480px em telas
maiores; texto base ≥14px; áreas de toque ≥44px. Validar no DevTools (device toolbar) nesses
breakpoints.

## Decisões

- Estado do servidor é lido primariamente do **dataset local** (Dexie) — o app não depende de rede
  para exibir/gravar. A API é usada para **login** e **sincronização**.
- Tokens JWT em `localStorage` (nunca dados clínicos). Logout limpa tokens, preservando o dataset
  local.
- Gráfico de evolução em **SVG inline** (escala real por métrica + linha de meta), sem biblioteca de
  charting.
  1
