# API REST e tempo real

Base: `/api`. Respostas em JSON. Erros: `{ "error": "mensagem", "issues": [...] }`.

## Acesso (sem login)

O painel roda no próprio computador e não tem login:

- só responde com `Host` = `localhost`, `127.0.0.1` ou `[::1]` (ou nomes em `ALLOWED_HOSTS`);
- toda alteração (POST/PUT/PATCH/DELETE) precisa do cabeçalho `X-Stardew-Monitor: 1` e, se houver `Origin`, ele precisa ser local;
- `POST /processes/kill` só é aceito a partir do próprio computador (loopback).

**Agentes** usam autenticação própria: `Authorization: Bearer <token>` + `X-Agent-Timestamp` (ms) + `X-Agent-Signature` = HMAC-SHA256(chave = sha256(token) em hex, mensagem = `"<timestamp>.<corpo>"`).

## Utilitárias

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | `{ ok, app: "stardew-monitor", uptimeSec }` |
| GET | `/dados` | Formato da v2 (compatibilidade com o agente PHP) |

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

## Painel

| Método | Rota | Descrição |
|---|---|---|
| GET | `/metrics?machine=id\|uid` | Leitura atual (padrão: máquina local) + médias recentes + tempo acumulado |
| GET | `/history?machine=&range=15m\|1h\|6h\|24h\|7d\|30d` | Série com média e máximo de cada métrica |
| GET | `/stream` | Server-Sent Events (abaixo) |
| GET | `/machines` | Lista de fazendas com status (`ok`, `warn`, `crit`, `offline`) |
| GET | `/machines/:id` | Uma fazenda |
| POST | `/machines` | `{ name, farmName?, theme }` → `{ machine, token }` (token mostrado uma vez) |
| PATCH | `/machines/:id` | `{ name?, farmName?, theme? }` |
| POST | `/machines/:id/token` | Gera novo token (o antigo deixa de valer) |
| DELETE | `/machines/:id` | Remove a fazenda e seu histórico |
| GET | `/processes?machine=&sort=cpu\|mem\|name\|pid&order=&limit=10\|25\|50\|100&q=&filter=all\|active\|heavy\|user` | Processos |
| POST | `/processes/kill` | `{ machine?, pid, name, confirm: true }` — "Expulsar morador" |
| GET | `/notes?q=&category=&machine=` | Diário |
| POST | `/notes` | `{ title, body, category, machineId? }` |
| PUT | `/notes/:id` | Edita |
| DELETE | `/notes/:id` | Apaga |
| GET/POST/PATCH/DELETE | `/quests[/:id]` | Quadro de Missões |
| GET | `/achievements?machine=` | Conquistas, progresso e histórico |
| GET | `/notifications?limit=&offset=&kind=&category=&machine=` | Histórico de avisos |
| POST | `/notifications/read` | Marca como lidos |
| DELETE | `/notifications` | Limpa o histórico |
| POST | `/notifications/test/:channel` | Testa `discord`, `telegram` ou `email` |
| GET | `/settings` | Configurações + **status** dos segredos (nunca os valores) |
| PUT | `/settings/:section` | `thresholds`, `notifications`, `weather`, `achievements`, `appearance`, `retention`, `festivals` |
| DELETE | `/settings/:section` | Restaura o padrão |
| PUT | `/secrets` | Grava credenciais (só escrita; `null` apaga) |
| PUT | `/preferences` | Preferências visuais (atualização parcial: `sound`, `music`, `alertSound`, `uiTheme`, `selectedMachine`, `reducedMotion`) |
| GET | `/audit?limit=&offset=&action=` | Registro de auditoria |

## Tempo real (SSE)

`GET /api/stream`. Eventos:

| Evento | Dados |
|---|---|
| `hello` | `{ machines: LivePayload[] }` — estado inicial |
| `metrics` | `LivePayload` de uma fazenda a cada leitura |
| `machine` | `{ id, action: created\|updated\|removed\|status }` |
| `notification` | Aviso novo (alerta, recuperação, sistema) |
| `achievement` | Conquista desbloqueada |
| `command` | Resultado de comando remoto |
| `settings` | Alguma configuração mudou |

`LivePayload = { machine, snapshot (sem processos), derived: { cpuAvg1m, cpuAvg5m }, receivedAt, farmSeconds }`.

Exemplo:

```bash
curl http://localhost:3001/api/metrics
curl -N http://localhost:3001/api/stream
curl -X POST -H 'X-Stardew-Monitor: 1' -H 'Content-Type: application/json' -d '{"text":"Limpar a poeira"}' http://localhost:3001/api/quests
```
