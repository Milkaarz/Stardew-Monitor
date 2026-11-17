# Deploy: local x hospedado

## O ponto mais importante

**O servidor monitora a máquina em que ele está rodando.** Um navegador não consegue ler o hardware de quem acessa o site, e nenhuma hospedagem (Render, Vercel, Railway, VPS...) consegue enxergar o seu computador pessoal.

| Cenário | O que a "Fazenda Principal" mostra | Como monitorar o seu PC |
|---|---|---|
| Servidor rodando **no seu PC** | O seu PC ✅ | Já está monitorando |
| Servidor numa **VPS/Render** | A máquina da hospedagem | Rode o **agente** no seu PC |
| Servidor em **Docker** | O contêiner (com limites do Docker) | Rode o **agente** nativo |
| **Vercel / hospedagem estática** | Não funciona: não há servidor Node persistente, SSE nem banco local | Use uma hospedagem com processo Node |

Se o monitor da máquina da hospedagem não interessa, desligue com `LOCAL_MONITOR=false` — o painel fica só com as fazendas dos agentes.

## 1. Local (uma máquina)

```bash
npm install && npm run build && npm start
```

SQLite em `data/stardew.db`. Acesse `http://localhost:3001` ou, na rede local, `http://IP-do-PC:3001`. Para acesso fora de casa, prefira uma VPN (Tailscale, WireGuard) a abrir a porta no roteador.

## 2. Docker

```bash
cp .env.example .env            # defina ADMIN_PASSWORD e APP_SECRET
docker compose up -d            # SQLite no volume stardew-data
```

Com PostgreSQL:

```bash
# no .env: DATABASE_URL=postgres://stardew:stardew@postgres:5432/stardew  e  POSTGRES_PASSWORD=...
docker compose --profile postgres up -d
```

A imagem roda como usuário sem privilégios, tem healthcheck (`/api/health`) e guarda os dados em `/app/data`.

## 3. Servidor central na internet (várias máquinas)

1. Hospede o servidor (VPS com Docker, Render com "Web Service", Railway, Fly.io...). Use **PostgreSQL** para várias máquinas e para não perder dados em hospedagens com disco efêmero (no Render, o disco do serviço é apagado a cada deploy, a menos que você use um Persistent Disk).
2. Coloque **HTTPS** na frente (a maioria das hospedagens já fornece; numa VPS, use Caddy ou Nginx).
3. Variáveis mínimas: `NODE_ENV=production`, `APP_SECRET`, `ADMIN_PASSWORD`, `DATABASE_URL`, `TRUST_PROXY=1`. Considere `LOCAL_MONITOR=false`.
4. Registre cada máquina em **Pelican Town** e instale o agente nelas ([agente.md](agente.md)).

### Exemplo: Render

- Tipo: Web Service (Docker). Porta: 3001. Health check path: `/api/health`.
- Banco: Render PostgreSQL → copie a "Internal Database URL" para `DATABASE_URL` e use `DATABASE_SSL=true` se a URL for externa.
- Variáveis: as do passo 3.

### Exemplo: Caddy na frente do Docker

```
monitor.seudominio.com {
  reverse_proxy localhost:3001
}
```

O SSE (`/api/stream`) funciona por trás de Caddy e Nginx; no Nginx, desative o buffering para essa rota (`proxy_buffering off;`) — o servidor já envia `X-Accel-Buffering: no`.

## SQLite ou PostgreSQL?

| | SQLite | PostgreSQL |
|---|---|---|
| Instalação | nenhuma | servidor/serviço gerenciado |
| Ideal para | 1 máquina, até poucas fazendas | várias máquinas, hospedagem na nuvem |
| Backups | copiar `data/stardew.db` (com o servidor parado ou usando `sqlite3 .backup`) | `pg_dump` |

As migrations rodam sozinhas no início (ou com `npm run migrate`). Os dois bancos usam o mesmo esquema e são testados no CI.

## Atualizando

```bash
git pull
npm install
npm run build
npm start        # migrations novas são aplicadas automaticamente
```

## Versão 2 (hospedagem PHP)

O modo antigo — agente que envia para um `receber.php` em hospedagem compartilhada — continua disponível em `legacy/`. Veja [legado-php.md](legado-php.md).
