# 🌾 Stardew Monitor

Monitor de recursos do sistema Linux com tema **Stardew Valley**, feito em Shell Script (Bash) para a disciplina de Sistemas Operacionais.

## Objetivo e problema

Acompanhar o uso de CPU, memória e disco e gerenciar processos pelo terminal costuma ser pouco amigável. O Stardew Monitor traduz esses dados para a linguagem da fazenda e entrega relatórios, logs e backups automatizados.

| Recurso do Linux | Na fazenda | Fonte dos dados |
|---|---|---|
| CPU | ⚡ Energia (100% − uso de CPU) | `/proc/stat` |
| Memória RAM | 🎒 Mochila (36 espaços) | `/proc/meminfo` |
| Disco | 🏚️ Silo | `df` |
| Processos | 🏘️ Moradores de Pelican Town | `ps` |
| Arquivo de log | 📖 Diário da Fazenda | `diario.log` |
| Backup | 📦 Celeiro | `tar` |
| Processo iniciado/encerrado | 🧑‍🌾 Trabalhador contratado/dispensado | `nohup`, `kill` |

## Tecnologias

Bash, utilitários GNU/Linux (`ps`, `df`, `tar`, `awk`, `kill`, `cron`), Git e GitHub.

## Conceitos de Sistemas Operacionais aplicados

1. **Gerenciamento de processos**: `processos` lista processos com `ps`. `contratar` inicia um processo em segundo plano com `nohup`. `dispensar` o encerra com sinais (`SIGTERM`, depois `SIGKILL` se necessário).
2. **CPU e memória**: lê `/proc/stat` duas vezes com 1 s de intervalo para calcular o uso real de CPU, e `/proc/meminfo` para a RAM.
3. **Armazenamento e disco**: `df` informa o uso do disco e `backup` compacta arquivos com rotação dos mais antigos.
4. **Arquivos, diretórios e permissões**: a pasta de dados é criada com `chmod 700` e os relatórios com `chmod 600`.
5. **Variáveis de ambiente**: `FAZENDA_DIR`, `BAU_DIR`, `ALERTA_CPU`, `ALERTA_RAM`, `ALERTA_DISCO` e `MANTER_BACKUPS` configuram o comportamento.
6. **Registro de informações operacionais**: toda ação grava uma linha com data e nível no `diario.log`.
7. **Agendamento de tarefas**: `scripts/setup.sh --cron` instala uma entrada no `cron`.

Escolhemos esses conceitos porque são os que um administrador de sistemas usa no dia a dia, e porque cada um tem um resultado visível na demonstração.

## Funcionalidades

- `status`: barras de Energia, Mochila e Silo com alertas ("Você está exausto!")
- `processos [N]`: top N processos por CPU
- `relatorio`: relatório em Markdown
- `backup`: backup `.tar.gz` do baú com rotação
- `contratar <cmd>` / `dispensar <pid>` / `trabalhadores`: ciclo de vida controlado de processos
- `historico [N]`: consulta o diário (log)

## Instalação e execução

Requisitos: Linux com Bash 4+ e utilitários padrão (`ps`, `df`, `tar`, `awk`).

```bash
git clone https://github.com/<usuario>/stardew-monitor.git
cd stardew-monitor
./scripts/setup.sh          # dá permissão de execução e prepara os diretórios
./stardew-monitor.sh status
```

Comandos de exemplo:

```bash
./stardew-monitor.sh processos 5
./stardew-monitor.sh relatorio
./stardew-monitor.sh backup
./stardew-monitor.sh contratar sleep 300     # mostra o PID
./stardew-monitor.sh trabalhadores
./stardew-monitor.sh dispensar <PID>
./stardew-monitor.sh historico 10
```

Os dados gerados ficam em `~/.stardew-monitor/` (ou em `$FAZENDA_DIR`).

## Scripts e automação

- `scripts/setup.sh`: prepara o ambiente. Com `--cron`, agenda um relatório diário às 08:00.
- `scripts/backup-diario.sh`: gera relatório e backup em sequência, pronto para o cron.
- Exemplo manual de cron: `0 2 * * * /caminho/stardew-monitor/scripts/backup-diario.sh`

## Como testar

```bash
./tests/test.sh
```

Os 10 testes verificam o status, o log, as permissões, os processos, o relatório, o backup (com rotação) e o ciclo de vida de um processo. Eles usam um diretório temporário e não alteram seus dados.

Para verificar na demonstração, estressando a CPU e acompanhando a Energia cair:

```bash
./stardew-monitor.sh contratar sh -c 'while :; do :; done'
./stardew-monitor.sh status          # Energia cai
./stardew-monitor.sh dispensar <PID>
./stardew-monitor.sh status          # Energia volta
```

Para forçar um alerta: `ALERTA_RAM=0 ./stardew-monitor.sh status`.

## Limitações conhecidas

- Só funciona em Linux (depende de `/proc`).
- O `status` leva cerca de 1 segundo para medir a CPU.
- O `dispensar` só encerra processos contratados pelo próprio programa, por segurança.
- O Stardew Valley é marca de ConcernedApe. Este projeto é acadêmico e não tem fins comerciais.


```
