# Arquitetura

## Visão geral

Monorepo com npm workspaces. Cada parte tem uma responsabilidade e se comunica pela API:

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `shared/` | Regras puras, sem E/S: formato do snapshot, conversão métricas → fazenda, alertas, estações, festivais, conquistas, mensagens, proteção de processos | — |
| `agent/` | Coletor multiplataforma (`systeminformation` + leituras diretas do SO) e o agente (buffer, envio assinado, comandos) | shared |
| `database/` | Adaptadores SQLite (`node:sqlite`) e PostgreSQL (`pg`) com a mesma interface assíncrona; migrations | — |
| `backend/` | Express: proteção local (sem login), API, SSE, ingestão, histórico, alertas, notificações, conquistas, agendador | shared, agent (coletor), database |
| `app/` | Aplicativo baixável: abre o servidor local e o navegador; interface embutida no executável | backend |
| `frontend/` | Preact + Vite: fazenda em SVG, páginas, gráficos, sons | shared |

## Fluxo de dados

1. **Coleta.** O mesmo `Collector` roda no servidor (monitor local embutido) e em cada agente. Camadas: CPU/memória/rede/E-S/GPU a cada leitura; discos e bateria a cada 30 s; dados estáticos a cada 10 min. As camadas lentas atualizam em segundo plano.
2. **Ingestão** (`IngestService`), igual para local e remoto: grava a leitura bruta → atualiza o estado ao vivo em memória (com janelas de 1 e 5 min de CPU) → avalia alertas → atualiza conquistas → publica no barramento → SSE para os navegadores.
3. **Agregação** (a cada minuto): reprocessa só o trecho que recebeu dados (inclusive leituras atrasadas de um agente que ficou sem rede) em médias/máximos por minuto e por hora, com *upsert*.
4. **Retenção** (a cada hora): apaga brutos > 26 h, minutos > 8 dias, horas > 400 dias (configurável).
5. **Interface**: recebe o snapshot e calcula o estado visual com `computeFarmState` (shared). Mesma função, testada, para qualquer tela.

## Banco de dados

| Tabela | Conteúdo |
|---|---|
| `machines` | Fazendas: nome, tema, hash do token do agente, status, informações de hardware |
| `metrics_raw` | Leituras brutas (PK máquina+timestamp: reenvio não duplica) |
| `metrics_agg` | Média e máximo por minuto (`res=60`) e por hora (`res=3600`) |
| `machine_state` | Contadores das conquistas (uptime acumulado, sequência ociosa...) |
| `achievements` | Conquistas desbloqueadas com data |
| `notifications` | Histórico de avisos e resultado da entrega em cada canal |
| `notes`, `quests` | Diário e Quadro de Missões |
| `settings`, `secrets` | Configurações e preferências visuais (JSON) e credenciais criptografadas (AES-256-GCM) |
| `audit_log` | Alterações e tentativas de encerrar processos |
| `agent_commands` | Fila de comandos para agentes |

Datas são guardadas em milissegundos (BIGINT) para o mesmo SQL funcionar nos dois bancos. Consultas usam `?`, convertidos para `$n` no PostgreSQL.

## Alertas

`evaluateSnapshot` transforma a leitura em níveis por categoria. O `AlertTracker` (um por máquina) só confirma um nível depois do tempo de sustentação, notifica ao entrar em aviso/crítico, avisa agravamentos na hora, avisa a recuperação e respeita o intervalo mínimo — então uma situação que continua não gera mensagens repetidas.

## Frontend

```
frontend/src/
  App.jsx            casca, autenticação, rotas
  services/          api (cabeçalho do painel), live (SSE + fallback por polling), store, router, prefs
  components/        Panel, Button, Bar, Modal, Toasts, PixelChart, formulários
  farm/              FarmScene + Buildings, Field, Animals, Scenery, Weather, sprites, paleta
  pages/             Fazenda, Pelican Town, Histórico, Moradores, Diário, Missões, Conquistas, Avisos, Ajustes
  audio/             efeitos e música 8 bits gerados com Web Audio
  styles/            base (madeira/pergaminho + temas) e páginas
```

A arte é feita de sprites em grade de caracteres convertidos em `<path>` SVG, com cores em variáveis CSS (estação × tema × hora do dia). Animações em CSS com `steps()` para o efeito pixelado, respeitando `prefers-reduced-motion`.

## Decisões

- **SSE** em vez de WebSocket: fluxo só servidor → navegador, simples e reconecta sozinho.
- **SQLite nativo do Node**: zero compilação no Windows; PostgreSQL para várias máquinas.
- **Monitor local = agente embutido**: um único caminho de ingestão, testado uma vez.
- **Sem login, só local**: o servidor escuta em 127.0.0.1 e recusa outros `Host`/`Origin`; o painel sem senha só é acessível a quem já usa o computador.
- **Executável único**: o aplicativo é o Node.js com o servidor e a interface embutidos (Single Executable Applications).
- **Sem dados fictícios**: sensor ausente é `null` e a interface diz "indisponível".
