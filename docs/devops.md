# Desenvolvimento, testes e CI

## Ambiente

- Node.js 22.13+ (recomendado 24), npm, Git.

```bash
npm install
npm run dev        # backend em http://localhost:3001 (reinicia ao salvar)
npm run dev:web    # interface com recarga instantânea em http://localhost:5173 (repassa /api ao backend)
```

## Scripts

| Script | O que faz |
|---|---|
| `npm start` | Servidor de produção (API + `frontend/dist`) |
| `npm run dev` / `npm run dev:web` | Desenvolvimento |
| `npm run build` | Compila a interface |
| `npm run agent` | Roda o agente (usa `.env`) |
| `npm run migrate` | Aplica migrations pendentes |
| `npm run app` | Roda o código do aplicativo (servidor local + abre o navegador) |
| `npm run app:build` | Gera o executável em `release/` |
| `npm run lint` | ESLint |
| `npm test` | Todos os testes (SQLite) |
| `npm run test:pg` | Persistência + API no PostgreSQL (`TEST_DATABASE_URL` e `API_TEST_PG`) |
| `npm run check` | lint + testes + build |

## Testes

Usam o executor nativo `node:test` e `supertest`:

| Pasta | Cobre |
|---|---|
| `tests/unit/farm.test.js` | Conversão de métricas em indicadores visuais (plantação, fumaça, carroça, moinho, vento, clima, animais, estamina) |
| `tests/unit/alerts.test.js` | Limites, sustentação, cooldown, agravamento, recuperação, mensagens |
| `tests/unit/seasons-messages.test.js` | Estações, dia/noite, Páscoa, festivais, mensagens, formatação, progresso das conquistas |
| `tests/unit/collector.test.js` | Cálculos e leitores de cada SO, proteção de processos e **uma coleta real** na máquina que roda o teste |
| `tests/unit/agent.test.js` | Assinatura agente↔servidor, configuração, buffer offline, comandos |
| `tests/unit/frontend.test.js` | Paleta da cena para todos os temas/estações/horários |
| `tests/api/local.test.js` | Sem login: só localhost, proteção contra CSRF e DNS rebinding, expulsão só local, tabelas de login removidas |
| `tests/api/api.test.js` | Todos os endpoints, agentes (assinatura, replay, despedida, sem sinal), histórico, diário, missões, conquistas, alertas e canais, segredos, processos e expulsão (com um processo real descartável), compatibilidade |
| `tests/integration/persistence.test.js` | Migrations, deduplicação, agregação ponderada, retenção e reinício do servidor no mesmo banco |

Para rodar no PostgreSQL localmente:

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=stardew -p 5432:5432 postgres:17-alpine
TEST_DATABASE_URL=postgres://postgres:stardew@localhost:5432/postgres \
API_TEST_PG=postgres://postgres:stardew@localhost:5432/postgres npm run test:pg
```

## Integração contínua

`.github/workflows/ci.yml`, em todo push para `main` e em pull requests:

1. **test** (Ubuntu Node 22 e 24, Windows Node 24): `npm ci` → lint → testes → build;
2. **postgres**: suíte de persistência e API com um serviço PostgreSQL 17;
3. **docker**: build das imagens do servidor e do agente;
4. **app**: gera o executável no Windows e no Linux, testa se ele sobe e responde e publica como artefato;
5. **release** (tags `v*`): cria a Release do GitHub com os executáveis.

## Convenções

- Código em módulos ES; regras de negócio puras em `shared/` (fáceis de testar).
- Sensor ausente = `null`. Nunca preencher com valores fictícios.
- Toda entrada da API passa por um esquema zod (`backend/src/schemas.js`).
- Toda alteração relevante registra auditoria.
- Mudanças no banco = nova migration em `database/migrations/` (nunca editar uma já publicada).
- Antes de abrir um PR: `npm run check`.
