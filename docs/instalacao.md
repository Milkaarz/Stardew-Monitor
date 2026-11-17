# Instalação e configuração (código-fonte)

> Só quer usar? Baixe o [aplicativo](aplicativo.md): não precisa instalar nada. Esta página é para rodar pelo código-fonte.

## Requisitos

- **Node.js 22.13+** (recomendado 24). O banco padrão usa o módulo `node:sqlite` embutido no Node, sem compilação.
- npm 10+.
- Windows 10/11, Linux ou macOS.
- Opcional: PostgreSQL 14+ (várias máquinas), Docker.

## Instalação

```bash
npm install          # instala todos os módulos (workspaces)
npm run build        # compila a interface em frontend/dist
npm start            # sobe o painel em http://localhost:3001 (só neste computador)
```

Na primeira execução:

1. as migrations criam as tabelas (`data/stardew.db`);
2. um segredo é gerado em `data/.app-secret` (se `APP_SECRET` não estiver definido);
3. o monitor local começa a coletar a cada 5 s.

Não há login: o painel só responde no próprio computador (veja [seguranca.md](seguranca.md)).

## Configuração (.env)

Copie `.env.example` para `.env`. As principais variáveis:

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3001` | Porta HTTP |
| `HOST` | `127.0.0.1` | Interface de rede (use `0.0.0.0` só para receber agentes de outras máquinas) |
| `ALLOWED_HOSTS` | — | Nomes extras aceitos no endereço do painel |
| `DATABASE_URL` | `sqlite:./data/stardew.db` | `sqlite:arquivo.db` ou `postgres://...` |
| `APP_SECRET` | gerado | Criptografa credenciais salvas pelo painel (≥ 32 caracteres) |
| `LOCAL_MONITOR` | `true` | Monitorar a máquina do servidor |
| `LOCAL_INTERVAL` | `5` | Segundos entre leituras locais |
| `ALLOW_PROCESS_KILL` | `true` | Permitir "Expulsar morador" (só a partir deste computador) |
| `PROTECTED_PROCESSES` | — | Nomes extras protegidos (vírgula) |
| `DISCORD_WEBHOOK_URL`, `TELEGRAM_*`, `SMTP_*` | — | Canais de notificação (têm prioridade sobre o painel) |

A lista completa e comentada está no [.env.example](../.env.example).

## Configurações pelo painel

Em **Ajustes**:

- **Estações**: calendário real (hemisfério sul ou norte) ou próprio (28 dias por estação); decorações de festival.
- **Clima**: limites de carga e temperatura para nublado, chuva, tempestade, calor e vento.
- **Conquistas**: parâmetros de Dia Tranquilo, Máquina Incansável e Fazenda Organizada.
- **Festivais**: ativar/desativar e mudar as datas (por estação, data fixa ou relativa à Páscoa).
- **Retenção**: quanto tempo guardar leituras, médias, avisos e auditoria.
- **Preferências** (tema da interface, sons, música, animações reduzidas) e **Auditoria**.

Em **Avisos**: limites de alerta por categoria, intervalo entre alertas e canais (Discord, Telegram, e-mail) com botão de teste.

Em **Pelican Town > Gerenciar**: nome e tema de cada fazenda, troca de token e remoção.


## Sensores por sistema

| Métrica | Windows | Linux | macOS |
|---|---|---|---|
| CPU (total e núcleos), RAM, swap, uptime | ✅ | ✅ | ✅ |
| Discos | ✅ | ✅ | ✅ |
| Rede (taxa e totais) | ✅ contadores de desempenho | ✅ `/proc/net/dev` | ✅ |
| E/S de disco | ✅ contadores de desempenho | ✅ `/proc/diskstats` | ✅ |
| Temperatura da CPU | LibreHardwareMonitor (ou WMI como admin) | ✅ `hwmon`/`thermal` | parcial |
| Ventoinhas (RPM) | LibreHardwareMonitor | ✅ `hwmon` | ❌ |
| GPU (uso, temperatura, VRAM) | NVIDIA | NVIDIA, AMD/Intel | ❌ |
| Bateria | ✅ | ✅ | ✅ |

Sensor ausente aparece como "indisponível" — o sistema nunca inventa valores.

### Temperatura e ventoinhas no Windows

1. Baixe o [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases) e execute-o (como administrador).
2. Deixe-o aberto (pode minimizar na bandeja). O coletor detecta o namespace WMI `root/LibreHardwareMonitor` sozinho em até 1 minuto.

## Rodar em segundo plano

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs --only servidor   # ou --only agente
pm2 save
pm2 startup        # Linux/macOS; no Windows use pm2-installer ou o Agendador de Tarefas
```
