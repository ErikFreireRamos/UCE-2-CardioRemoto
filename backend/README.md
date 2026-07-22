# CardioRemoto — Backend

Servidor central + API de sincronização do **CardioRemoto** (ecossistema mare.IA): monitoramento de
pacientes cardiovasculares por Agentes de Saúde (AS), com cliente mobile **offline-first**.

**Stack:** Node + TypeScript · Fastify · PostgreSQL/Prisma · Zod · JWT · Vitest · Docker.

---

## Subir tudo com Docker (recomendado — sem Postgres na máquina)

```bash
cp .env.example .env          # ajuste CORS_ORIGIN com o IP do seu PC (veja abaixo)
docker compose up --build     # sobe Postgres + API, aplica migrations e roda o seed
```

- API em `http://localhost:3000` · documentação (Swagger) em `http://localhost:3000/docs`.
- Para subir **só o Postgres** (e rodar a API fora do contêiner): `docker compose up postgres`.

## Rodar a API fora do contêiner (opcional)

```bash
docker compose up -d postgres
npm install
# aponte o DATABASE_URL para localhost (o compose publica a porta 5432):
export DATABASE_URL="postgresql://cardio:cardio@localhost:5432/cardioremoto?schema=public"
npm run migrate:deploy && npm run seed
npm run dev
```

## Acessar do celular (mesma rede Wi-Fi)

1. Descubra o IP do PC: **Windows** `ipconfig` (procure "Endereço IPv4", ex. `192.168.0.10`).
2. A API já escuta em `0.0.0.0` e publica a porta `3000` → acesse `http://<IP-do-PC>:3000`.
3. No `.env`, inclua a origem do frontend em `CORS_ORIGIN`, ex.:
   `CORS_ORIGIN=http://localhost:5173,http://192.168.0.10:5173`.
4. Aponte o frontend (`VITE_API_URL`) para `http://<IP-do-PC>:3000` — **nunca** `localhost` (no
   celular, `localhost` é o próprio aparelho).

## Credenciais do seed

- **AS:** login `sandra.lima` · senha `cardio123`.
- **6 pacientes** (Maria Silva, José Nunes, Tiago Feitosa, Lucas Cavalcante, Carla Nascimento, Luana
  Torres), com risco **derivado** dos dados. A ordenação por prioridade reproduz o exemplo do
  documento de requisitos (Maria 3 dias atrasado → Luana 5 dias para visita).

## Scripts

| Script | Ação |
| --- | --- |
| `npm run dev` | API em watch (tsx) |
| `npm run build` / `start` | Compila / executa `dist` |
| `npm test` | Testes (unitários do domínio clínico + integração) |
| `npm run migrate` / `migrate:deploy` | Migrations (dev / produção) |
| `npm run seed` | Popula pacientes + AS |

## Testes

```bash
docker compose up -d postgres
# banco de teste separado:
docker exec <container-postgres> psql -U cardio -d cardioremoto -c "CREATE DATABASE cardioremoto_test"
export TEST_DATABASE_URL="postgresql://cardio:cardio@localhost:5432/cardioremoto_test?schema=public"
DATABASE_URL=$TEST_DATABASE_URL npm run migrate:deploy
npm test
```

Cobrem: todo o `domain/clinical/` (risco, prioridade, alertas, IMC, idade) e os fluxos
alternativos/exceção — **login bloqueado (5/15min)**, **CPF duplicado (409)**, **visita vazia (422)**,
**sync idempotente / falha parcial / last-write-wins**.

---

## Endpoints

| Método | Rota | UC / notas |
| --- | --- | --- |
| POST | `/auth/login` | UC01. 5 tentativas → bloqueio 15 min (423) |
| POST | `/auth/refresh` · `/auth/logout` | Rotação / revogação de refresh token |
| POST | `/patients` | UC02. CPF duplicado → **409**; evento CV exige data se aterosclerótico |
| GET | `/patients?risk=&sort=visitPriority&search=` | UC03/04. Cada item: risco, próxima visita, status, alerta ativo |
| GET | `/patients/:id` | Perfil + controle atual (PA/HbA1c/LDL) + fatores de risco |
| POST | `/patients/:id/visits` | UC05. ≥1 campo (**422**); IMC no servidor; alertas; recalcula risco |
| GET | `/patients/:id/visits` | UC06 (tabela) |
| GET | `/patients/:id/evolution?metrics=pa,glicemia,ldl,hba1c,peso` | UC06 (gráfico) |
| POST | `/sync` | UC07. Lote offline idempotente, LWW, falha parcial `{synced, failed}` |
| GET | `/sync/pull?since=<ISO>` | Mudanças do servidor desde um timestamp |

Erros sempre no formato `{ error: { code, message, details } }`.

---

## Decisões arquiteturais

- **Domínio clínico puro** (`src/domain/clinical/`), sem I/O, 100% testável — é a fonte de verdade das
  regras: metas (PA<140/90, HbA1c<7%, LDL<130), classificação de risco, alertas, prioridade de visita,
  IMC e idade. Reutilizado por serviços e pelo seed.
- **Metas / risco (confirmado com o cliente):** para cada métrica (PA, HbA1c, LDL) usa-se o **último
  valor disponível em qualquer visita**; métrica nunca medida **não** conta como fora da meta.
  - Verde: tudo na meta e sem evento CV no último ano. Amarelo: 1–2 fora e sem histórico
    aterosclerótico. Vermelho: ≥3 fora **ou** evento aterosclerótico ≤ 1 ano.
  - **`sem_dados`** (neutro): paciente sem nenhuma métrica de meta medida (ex.: recém-cadastrado). Na
    ordenação por prioridade aparece no **topo** (1ª visita pendente).
  - **Lacuna documentada:** histórico aterosclerótico não-recente + 1–2 fora da meta → classificado
    **vermelho** (conservador).
- **Evento CV:** a data (`cardiovascularEventAt`) é **obrigatória** no cadastro quando o histórico é
  IAM/AVC/DAP, permitindo aplicar a janela de 1 ano com precisão.
- **Glicemia** não é parâmetro de risco (só dispara alerta ≥250/<70 e aparece na evolução; a linha de
  meta do gráfico usa <180, apenas ilustrativa).
- **Offline-first (RNF001):** entidades sincronizáveis usam **UUID** (aceita id gerado no cliente) e
  `createdAt`/`updatedAt`. `/sync` faz upsert idempotente por id; conflito resolvido por `updatedAt`
  (**last-write-wins**) — como o `updatedAt` é gerenciado pelo servidor, reenviar o mesmo lote é no-op.
  Falha parcial retorna `{ synced, failed:[{id, reason}] }` e nunca perde dados no cliente.
- **Provisionamento de AS:** apenas via seed/admin (UC01 pressupõe usuário já cadastrado).
- **Segurança:** JWT (access curto + refresh rotacionável/revogável), senhas com bcrypt, `helmet`,
  CORS por env, rate limit na rota de login (além do bloqueio 5/15). O logger não registra corpos.
- **Formato da evolução** (deixado em aberto pelo documento): cada métrica retorna `unit`, `goal` e
  `points` (PA como `{date, systolic, diastolic}`; demais como `{date, value}`), para o cliente plotar
  em escalas independentes (small multiples).
