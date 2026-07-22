# CardioRemoto

Plataforma digital para **monitoramento de pacientes cardiovasculares** do Hospital Universitário
(ecossistema **mare.IA**), usada por **Agentes de Saúde (AS)** em campo. Sistema **offline-first**:
os dados são coletados localmente no dispositivo e sincronizados com o banco central quando há
conexão.

Implementação dos requisitos de `cardioremoto-design-project/project/uploads/DocumentoRequisitosV2.pdf`
e do protótipo de UI aprovado, conforme `InstruçõesBackend.md` e `InstruçõesFrontend.md`.

## Estrutura

| Pasta | O quê |
| --- | --- |
| [`backend/`](backend/) | API central + sincronização — Node + TS + Fastify + PostgreSQL/Prisma. Regras clínicas puras e testadas, JWT, Docker, OpenAPI em `/docs`. |
| [`frontend/`](frontend/) | Cliente **PWA mobile offline-first** — React + TS + Vite + Dexie. As 7 telas do protótipo, fila de sincronização, instalável. |
| `cardioremoto-design-project/` | Bundle de design (protótipos HTML) — referência visual. |

## Subir rápido (ambos)

```bash
# 1) Backend (sobe Postgres + API + seed)
cd backend
cp .env.example .env
docker compose up --build        # API em http://localhost:3000 · docs em /docs

# 2) Frontend (em outro terminal)
cd frontend
cp .env.example .env             # VITE_API_URL=http://localhost:3000
npm install
npm run dev                      # http://localhost:5173
```

Login: **sandra.lima / cardio123**.

Para testar no **celular** (mesma Wi-Fi) e instalar como PWA, veja os READMEs de cada pasta —
resumo: rode `npm run dev -- --host`, aponte `VITE_API_URL` para o **IP do PC** (não `localhost`),
inclua a origem no `CORS_ORIGIN` do backend e use um túnel https (`cloudflared`/`ngrok`) para o
service worker.

## Casos de uso implementados

| UC | Funcionalidade | Onde |
| --- | --- | --- |
| UC01 | Login + bloqueio após 5 tentativas por 15 min | backend `auth` · tela de Login |
| UC02 | Cadastrar paciente (idade automática, CPF duplicado → ver cadastro) | Cadastro |
| UC03 | Filtrar por risco (verde/amarelo/vermelho) | Lista (chips) |
| UC04 | Ordenar por prioridade de visita (atrasados primeiro) | Lista |
| UC05 | Inserir visita (antropométricos + vitais + 14 labs, ≥1 campo, IMC auto, alertas) | Nova visita |
| UC06 | Evolução (tabela + gráfico small multiples) | Evolução |
| UC07 | Sincronizar (manual + passiva, idempotente, falha parcial) | Sync sheet |
| RNF001 | Offline-first (dataset local + fila de sync) | Dexie + `/sync` |
| RNF002 | Responsivo (320–1024px, sem rolagem horizontal) | Layout mobile-first |

## Regras clínicas (núcleo)

Metas: **PA < 140/90 · HbA1c < 7% · LDL < 130**. Risco: verde (tudo na meta, sem evento CV no ano),
amarelo (1–2 fora, sem histórico aterosclerótico), vermelho (≥3 fora **ou** evento ≤ 1 ano),
`sem_dados` (sem métricas). Alertas: PA ≥180/120 ou <90/60 e glicemia ≥250 ou <70 (vermelho); LDL
≥190 (amarelo). Detalhes e decisões em [`backend/README.md`](backend/README.md).

## Testes

- **Backend:** `cd backend && npm test` — 55 testes (domínio clínico + integração dos fluxos de
  exceção: login bloqueado, 409, 422, sync idempotente/parcial/LWW).
- **Frontend:** `cd frontend && npm test` (unit + componentes) e `npm run test:e2e` (criar visita
  offline → sincronizar).
