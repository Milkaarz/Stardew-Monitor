# Outras formas de rodar

O recomendado é o [aplicativo baixável](aplicativo.md). Esta página cobre Docker, PostgreSQL e o modo com agentes.

## Por que não hospedar na internet?

O Stardew Monitor lê os sensores **da máquina onde ele roda**. Um site na internet não consegue ler o hardware de quem o visita, e nenhuma hospedagem (Render, Vercel, Railway, VPS...) enxerga o seu computador. Além disso, o painel **não tem login**: ele foi feito para responder só no próprio computador. Por isso não há modo "hospedado".

## 1. Código-fonte

```bash
npm install && npm run build && npm start
```

SQLite em `data/stardew.db`, painel em `http://localhost:3001`.

## 2. Docker

```bash
docker compose up -d            # SQLite no volume stardew-data; porta publicada só em 127.0.0.1
```

Com PostgreSQL:

```bash
# no .env: DATABASE_URL=postgres://stardew:stardew@postgres:5432/stardew  e  POSTGRES_PASSWORD=...
docker compose --profile postgres up -d
```

A imagem roda como usuário sem privilégios, tem healthcheck (`/api/health`) e guarda os dados em `/app/data`. Dentro do contêiner, o monitor local enxerga o contêiner/host do Docker (com limites); para o seu PC, prefira o aplicativo.

## 3. Várias máquinas na mesma rede (opcional)

1. No computador "central", rode o Stardew Monitor com `HOST=0.0.0.0` (pelo código-fonte, ou com a variável de ambiente definida antes de abrir o aplicativo). O **painel** continua respondendo só em `localhost`; a porta aberta serve apenas para os agentes, que usam token próprio.
2. Libere a porta 3001 no firewall só para a rede local.
3. Registre cada máquina em **Pelican Town** e instale o agente nelas ([agente.md](agente.md)), com `STARDEW_SERVER_URL=http://IP-do-central:3001` e `STARDEW_ALLOW_INSECURE=true` (rede doméstica confiável), ou use HTTPS com um proxy local.

## SQLite ou PostgreSQL?

| | SQLite | PostgreSQL |
|---|---|---|
| Instalação | nenhuma | servidor/serviço gerenciado |
| Ideal para | 1 máquina, até poucas fazendas | muitas máquinas com agentes |
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
