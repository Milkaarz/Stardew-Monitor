# Agente de monitoramento

> Opcional. Para monitorar só o computador onde você usa o painel, basta o [aplicativo](aplicativo.md).

O agente é um programa leve (Node.js + `systeminformation`) que roda em cada máquina monitorada:

- coleta as métricas localmente (o mesmo coletor que o servidor usa para a própria máquina);
- identifica a máquina (hostname, SO, UUID);
- envia as leituras ao servidor central a cada intervalo, em lotes;
- guarda as leituras num buffer se o servidor cair e envia tudo quando ele voltar;
- avisa o servidor quando é encerrado (a fazenda fica cinza na hora); se cair sem avisar, o servidor detecta a falta de sinal sozinho.

Consumo típico: ~40 MB de RAM e menos de 1% de CPU com intervalo de 10 s. No Windows ele mantém um único processo PowerShell auxiliar para ler os contadores de rede/disco, em vez de abrir um novo a cada leitura.

## 1. Registrar a máquina

No computador central, abra o painel e vá em **Pelican Town > + Registrar fazenda**. O central precisa estar rodando com `HOST=0.0.0.0` para aceitar conexões de outras máquinas (o painel continua só local). Escolha nome e tema. O token aparece **uma única vez**; o servidor guarda apenas o hash.

## 2. Instalar na máquina monitorada

Requisito: Node.js 22.13+.

```bash
git clone https://github.com/Milkaarz/Stardew-Monitor.git
cd Stardew-Monitor
npm install --omit=dev --workspace agent
```

Crie um `.env` na pasta:

```ini
STARDEW_SERVER_URL=https://monitor.seudominio.com
STARDEW_AGENT_TOKEN=sdm_...
STARDEW_INTERVAL=10
```

Teste a coleta sem enviar nada:

```bash
node agent/src/index.js --once
```

E rode:

```bash
npm run agent
# ou: node agent/src/index.js --server https://monitor.seudominio.com --token sdm_... --interval 10
```

## Opções

| Variável | Argumento | Padrão | Descrição |
|---|---|---|---|
| `STARDEW_SERVER_URL` | `--server` | — | Endereço do servidor |
| `STARDEW_AGENT_TOKEN` | `--token` | — | Token da fazenda |
| `STARDEW_INTERVAL` | `--interval` | `10` | Segundos entre leituras (2 a 3600) |
| `STARDEW_ALLOW_REMOTE_KILL` | `--allow-remote-kill` | `false` | Aceitar "Expulsar morador" vindo do servidor |
| `STARDEW_ALLOW_INSECURE` | `--allow-insecure` | `false` | Aceitar `http://` para servidor remoto |
| `STARDEW_PROCESS_EVERY` | `--process-every` | `0` | Enviar processos a cada N s (0 = só quando alguém abre a página Moradores) |
| `STARDEW_PROTECTED` | — | — | Processos extras protegidos |

## Segurança da comunicação

- Cada requisição leva o token (`Authorization: Bearer`) **e** uma assinatura HMAC-SHA256 do corpo com carimbo de tempo. O servidor recusa corpo alterado, relógio com mais de 5 minutos de diferença e requisição repetida (replay).
- O agente **recusa `http://` para servidores remotos**; use HTTPS (proxy reverso com Caddy/Nginx ou a hospedagem). `http://localhost` é aceito.
- O servidor nunca abre conexão com o agente. Comandos (como encerrar processo) só chegam na resposta do envio do próprio agente, e só são executados se o agente tiver `STARDEW_ALLOW_REMOTE_KILL=true`. O agente repete as verificações de proteção antes de agir.
- Token vazou? **Pelican Town > Gerenciar > Gerar novo token**: o anterior para de funcionar na hora.

## Rodar como serviço

**PM2 (Windows, Linux, macOS)**

```bash
pm2 start ecosystem.config.cjs --only agente
pm2 save
```

**systemd (Linux)** — `/etc/systemd/system/stardew-agent.service`:

```ini
[Unit]
Description=Stardew Monitor - agente
After=network-online.target

[Service]
WorkingDirectory=/opt/Stardew-Monitor
ExecStart=/usr/bin/node agent/src/index.js
Restart=always
User=stardew
EnvironmentFile=/opt/Stardew-Monitor/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now stardew-agent
```

**Windows (Agendador de Tarefas)**: crie uma tarefa "Ao fazer logon" executando `node.exe` com o argumento `agent\src\index.js` e "Iniciar em" apontando para a pasta do projeto.

**Docker (Linux)**: `docker compose --profile agent up -d` (veja as limitações no `agent/Dockerfile`: dentro de contêiner, discos e alguns sensores refletem a visão do contêiner).
