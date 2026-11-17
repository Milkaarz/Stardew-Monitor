# API REST e tempo real

Base: `/api`. Respostas em JSON. Erros: `{ "error": "mensagem", "issues": [...] }`.

## Autenticação

- **Painel**: `POST /api/auth/login` cria um cookie de sessão `sm_session` (HttpOnly, SameSite=Strict) e devolve um `csrf`. Toda requisição que altera dados (POST/PUT/PATCH/DELETE) precisa do cabeçalho `X-CSRF-Token: <csrf>`.
- **Agentes**: `Authorization: Bearer <token>` + `X-Agent-Timestamp` (ms) + `X-Agent-Signature` = HMAC-SHA256(chave = sha256(token) em hex, mensagem = `"<timestamp>.<corpo>"`).
- Papéis: **admin** (tudo) e **viewer** (somente leitura).

## Sem login

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Saúde do servidor |
| POST | `/auth/login` | `{ username, password }` → `{ user, csrf }` (limite: 10 tentativas / 15 min) |
| POST | `/auth/logout` | Encerra a sessão |
| GET | `/auth/me` | Usuário atual + `csrf` + recursos ativos (401 se anônimo) |
| GET | `/public/town` | Só se `PUBLIC_DASHBOARD=true`: nome da fazenda, status e percentuais (sem hostname/hardware/processos) |
| GET | `/dados` | Formato da v2 (compatibilidade). Sessão **ou** `LEGACY_API_TOKEN` (Basic ou `X-Token`) |

## Agentes

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| POST | `/agent/metrics` | `{ samples: Snapshot[] (≤100), commandResults?: [{ id, ok, error }] }` | `{ ok, accepted, sendProcesses, commands: [{ id, type, payload }] }` |
| POST | `/agent/goodbye` | `{ reason }` | `{ ok }` — marca a fazenda como desconectada |

Erros: 401 (token/assinatura/relógio), 409 (replay), 400 (leitura inválida), 429 (limite).

### Snapshot

```jsonc
{
  "v": 1, "ts": 1794940195222,
  "host": { "hostname": "PC", "platform": "win32", "os": "Windows 10 Pro", "arch": "x64", "kernel": "10.0.19045", "uuid": "..." },
  "cpu": { "load": 26, "cores": [30, 22], "model": "AMD Ryzen 5 1600X", "physicalCores": 6, "threads": 12, "speedGHz": 3.6, "temp": null, "loadAvg": null },
  "mem": { "total": 17133019136, "used": 15410806784, "available": 1722212352, "pct": 89.9, "swap": { "total": 0, "used": 0, "pct": 0 } },
  "disks": [{ "name": "C:", "mount": "C:", "fs": "NTFS", "size": 0, "used": 0, "free": 0, "pct": 97.7 }],
  "diskIO": { "readSec": 32031, "writeSec": 254749 },
  "net": { "iface": "Ethernet", "rxSec": 10227, "txSec": 376642, "rxTotal": 0, "txTotal": 0 },
  "gpus": [{ "name": "GTX 1060", "vendor": "NVIDIA", "util": 4, "temp": 48, "vramTotal": 0, "vramUsed": 0, "fanPct": 35, "powerW": 27.6 }],
  "fans": [{ "name": "Fan #1", "rpm": 1200 }],
  "battery": null,
  "uptimeSec": 200282,
  "processes": [{ "pid": 1, "name": "x", "user": null, "cpu": 0.5, "mem": 1.2, "memRss": 0, "started": 0, "state": null }]
}
```

Qualquer sensor pode ser `null`.

## Com login

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| GET | `/metrics?machine=id\|uid` | todos | Leitura atual (padrão: máquina local) + médias recentes + tempo acumulado |
| GET | `/history?machine=&range=15m\|1h\|6h\|24h\|7d\|30d` | todos | Série com média e máximo de cada métrica |
| GET | `/stream` | todos | Server-Sent Events (abaixo) |
| GET | `/machines` | todos | Lista de fazendas com status (`ok`, `warn`, `crit`, `offline`) |
| GET | `/machines/:id` | todos | Uma fazenda |
| POST | `/machines` | admin | `{ name, farmName?, theme }` → `{ machine, token }` (token mostrado uma vez) |
| PATCH | `/machines/:id` | admin | `{ name?, farmName?, theme? }` |
| POST | `/machines/:id/token` | admin | Gera novo token (o antigo deixa de valer) |
| DELETE | `/machines/:id` | admin | Remove a fazenda e seu histórico |
| GET | `/processes?machine=&sort=cpu\|mem\|name\|pid&order=&limit=10\|25\|50\|100&q=&filter=all\|active\|heavy\|user` | todos | Processos |
| POST | `/processes/kill` | admin | `{ machine?, pid, name, password, confirm: true }` — "Expulsar morador" |
| GET | `/notes?q=&category=&machine=` | todos | Diário |
| POST | `/notes` | admin | `{ title, body, category, machineId? }` |
| PUT | `/notes/:id` | admin | Edita |
| DELETE | `/notes/:id` | admin | Apaga |
| GET/POST/PATCH/DELETE | `/quests[/:id]` | leitura: todos | Quadro de Missões |
| GET | `/achievements?machine=` | todos | Conquistas, progresso e histórico |
| GET | `/notifications?limit=&offset=&kind=&category=&machine=` | todos | Histórico de avisos |
| POST | `/notifications/read` | todos | Marca como lidos |
| DELETE | `/notifications` | admin | Limpa o histórico |
| POST | `/notifications/test/:channel` | admin | Testa `discord`, `telegram` ou `email` |
| GET | `/settings` | todos | Configurações (admin também recebe o **status** dos segredos, nunca os valores) |
| PUT | `/settings/:section` | admin | `thresholds`, `notifications`, `weather`, `achievements`, `appearance`, `retention`, `festivals` |
| DELETE | `/settings/:section` | admin | Restaura o padrão |
| PUT | `/secrets` | admin | Grava credenciais (só escrita; `null` apaga) |
| PUT | `/auth/password` | todos | `{ currentPassword, newPassword }` |
| PUT | `/auth/prefs` | todos | Preferências visuais da conta |
| GET/POST/PATCH/DELETE | `/users[/:id]`, POST `/users/:id/password` | admin | Usuários |
| GET | `/audit?limit=&offset=&action=` | admin | Registro de auditoria |

## Tempo real (SSE)

`GET /api/stream` (com o cookie de sessão). Eventos:

| Evento | Dados |
|---|---|
| `hello` | `{ machines: LivePayload[] }` — estado inicial |
| `metrics` | `LivePayload` de uma fazenda a cada leitura |
| `machine` | `{ id, action: created\|updated\|removed\|status }` |
| `notification` | Aviso novo (alerta, recuperação, sistema) |
| `achievement` | Conquista desbloqueada |
| `command` | Resultado de comando remoto (admin) |
| `settings` | Alguma configuração mudou |

`LivePayload = { machine, snapshot (sem processos), derived: { cpuAvg1m, cpuAvg5m }, receivedAt, farmSeconds }`.

Exemplo:

```bash
curl -c cj -H 'Content-Type: application/json' -d '{"username":"admin","password":"..."}' http://localhost:3001/api/auth/login
curl -b cj http://localhost:3001/api/metrics
curl -b cj -N http://localhost:3001/api/stream
```
