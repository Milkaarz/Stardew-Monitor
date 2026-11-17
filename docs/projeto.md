# Documentação do projeto

## 1. Identificação

**Nome:** Stardew Monitor (versão 3)
**Categoria:** monitor de hardware e recursos do sistema, com visualização gamificada
**Repositório:** https://github.com/Milkaarz/Stardew-Monitor

## 2. Objetivo

Monitorar uma ou várias máquinas com dados reais, coletados continuamente, e apresentá-los como uma fazenda interativa em pixel art — sem abrir mão dos indicadores numéricos, do histórico e dos alertas de um monitor de sistema tradicional.

## 3. Requisitos funcionais

| ID | Requisito | Onde |
|---|---|---|
| RF01 | Coletar CPU (total, núcleos, threads, temperatura), RAM e swap, discos, E/S de disco, rede, GPU, ventoinhas, bateria, uptime e processos, tratando sensores indisponíveis | `agent/src/collector` |
| RF02 | Representar cada recurso como elemento da fazenda (casa, plantação, celeiro/silos, carroça/correio, moinho, clima, estamina, dias) | `shared/src/farm.js`, `frontend/src/farm` |
| RF03 | Estações (calendário real ou próprio), ciclo dia/noite e clima reativo com limites configuráveis | `shared/src/seasons.js`, `farm.js` |
| RF04 | Animais como indicadores de saúde, sem substituir os números | `frontend/src/farm/Animals.jsx` |
| RF05 | Conquistas persistentes com progresso, histórico e data | `backend/src/services/achievements.js` |
| RF06 | Festivais automáticos por data configurável, com decorações | `shared/src/seasons.js`, `Weather.jsx` |
| RF07 | Alertas configuráveis por categoria, sem repetição, com intervalo mínimo, histórico e envio por Discord, Telegram e e-mail | `shared/src/alerts.js`, `backend/src/services/alerts.js`, `notifier/` |
| RF08 | Cartão de status com mensagens contextuais e sem repetição excessiva | `shared/src/messages.js` |
| RF09 | Página de processos com ordenação, filtros, pesquisa e quantidade; encerramento autenticado, confirmado, protegido e auditado | `ProcessesPage.jsx`, `services/processes.js` |
| RF10 | Diário persistente com categorias, pesquisa, histórico por data e salvamento automático | `DiaryPage.jsx`, `routes/journal.js` |
| RF11 | Temas: Padrão, Floresta, Praia, Colina, Gengibre e Minas | `farm/palette.js`, `styles/base.css` |
| RF12 | Várias máquinas com agente, tokens individuais e mapa Pelican Town (verde/amarelo/vermelho/cinza) | `agent/`, `TownPage.jsx` |
| RF13 | Histórico com períodos de 15 min a 30 dias e agregação | `services/history.js`, `HistoryPage.jsx` |
| RF14 | Quadro de Missões (tarefas, inclusive diárias) — herdado da v2 | `QuestsPage.jsx` |
| RF15 | Compatibilidade com a v2 (`/api/dados` e hospedagem PHP) | `routes/public.js`, `legacy/` |

## 4. Requisitos não funcionais

- **Segurança:** autenticação, papéis, CSRF, rate limiting, validação, HMAC nos agentes, segredos criptografados, auditoria ([seguranca.md](seguranca.md)).
- **Desempenho:** coleta em camadas; processo auxiliar persistente no Windows; agregação incremental; interface sem bibliotecas pesadas (~50 KB de JS comprimido).
- **Compatibilidade:** Windows e Linux (macOS quando possível); SQLite e PostgreSQL.
- **Acessibilidade:** elementos da fazenda acessíveis por teclado e com descrição; gráficos com alternativa em tabela; animações reduzidas.
- **Manutenibilidade:** módulos separados, regras puras testáveis, migrations, CI.
- **Honestidade dos dados:** nada de valores aleatórios; sensor ausente é exibido como indisponível.

## 5. Limites conhecidos

As métricas pertencem à máquina onde o coletor roda. Uma hospedagem remota mostra o próprio servidor; para monitorar um computador pessoal, é preciso o agente instalado nele ([deploy.md](deploy.md)). Sensores de temperatura, ventoinhas e GPU dependem do sistema operacional e do hardware.
