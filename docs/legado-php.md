# Modo legado: hospedagem PHP (versão 2)

A versão 2 mostrava as métricas do seu PC num site PHP comum: um agente local lia o painel e enviava o último estado para `receber.php`, que salvava `dados.json`; a página `index.html` exibia esse arquivo. Tudo isso continua funcionando e está em `legacy/`:

| Arquivo | Função |
|---|---|
| `legacy/site/index.html` | Painel v2 para a hospedagem |
| `legacy/site/receber.php` | Recebe os dados (troque o `$TOKEN`) |
| `legacy/site/visitas.php` | Contador de visitas |
| `legacy/agente-stardew.cjs` | Agente v2: lê `/api/dados` do servidor local e envia ao `receber.php` |
| `legacy/painel-v2.html`, `legacy/index-v2.cjs` | Painel e servidor v2 originais, para referência |

## Usando com o servidor v3

O servidor v3 mantém a rota `/api/dados` no formato antigo. Para o agente PHP conseguir lê-la:

1. No `.env` do servidor: `LEGACY_API_TOKEN=um-token-forte`.
2. No `.env` do agente legado:

```ini
PAINEL_URL=https://seudominio.com/stardew/receber.php
PAINEL_TOKEN=mesmo-token-do-receber-php
PAINEL_INTERVALO=5
PAINEL_LOCAL=http://localhost:3001
PAINEL_SENHA=um-token-forte
```

3. Rode `npm run agente:php` (ou `pm2 start ecosystem.config.cjs --only agente-php`).

Esse modo mostra apenas o último estado (sem histórico, alertas, conquistas ou várias máquinas). Para isso, hospede o servidor v3 e use o agente novo ([deploy.md](deploy.md)).
