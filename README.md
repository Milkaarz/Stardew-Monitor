<p align="center">
  <img src="img/banner-stardew.svg" alt="Stardew Monitor: monitor de hardware em pixel art" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.13+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 22.13+">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Preact-673AB8?style=for-the-badge&logo=preact&logoColor=white" alt="Preact">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <br>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions">
  <img src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify">
  <img src="https://img.shields.io/badge/versão-3.0.0-c9a36a?style=for-the-badge" alt="Versão 3.0.0">
  <img src="https://img.shields.io/badge/licença-MIT-4caf50?style=for-the-badge" alt="Licença MIT">
</p>

# 🌾 Stardew Monitor: monitor de hardware em pixel art 🖥️

Monitor de hardware e recursos do sistema com **visual de fazenda em pixel art** 🧑‍🌾. Cada recurso real do computador vira um elemento da fazenda: a 🏠 **casa** é a CPU, a 🌱 **plantação** é a RAM, os 🏚️ **silos** são os discos, a 🛒 **carroça** é a rede, o 🌬️ **moinho** é a GPU, o ⛅ **clima** reage à carga e à temperatura, a 💪 **estamina** é a bateria e os 📅 **dias na fazenda** são o tempo ligado.

Não é só ilustração: **todos os números são leituras reais** 📊 do computador onde o app está rodando, guardadas em um banco local, com 🔔 alertas, 📈 histórico, 🏆 conquistas e 📖 diário. Tudo roda no seu computador: **sem login, sem conta e sem servidor na internet** 🔒.

| 🔗 Link | Para quê |
|---|---|
| 🌐 **Site:** https://stardewmonitor.netlify.app/ | Página de entrada: explica o projeto, leva ao download e abre o seu painel se o app já estiver aberto |
| 🐙 **Repositório:** https://github.com/Milkaarz/Stardew-Monitor | Código-fonte e documentação completa (`docs/`) |
| ⬇️ **Download (Windows):** [`StardewMonitor-windows-x64.exe`](https://github.com/Milkaarz/Stardew-Monitor/raw/main/release/StardewMonitor-windows-x64.exe) | Executável único, cerca de 90 MB |

> 🎨 Projeto de fã, inspirado na estética de jogos de fazenda em pixel art. Toda a arte é original, desenhada em código (SVG); nenhum recurso de jogo é usado. As imagens deste README são ilustrações feitas para a documentação, não capturas de tela.

---

## 🗺️ Sumário

| | | |
|---|---|---|
| 🎯 1. Objetivo | 🤔 2. Problema | 📐 3. Escopo |
| 🧑‍🌾 4. Como funciona | 📋 5. Requisitos | 🧰 6. Tecnologias |
| 🏛️ 7. Arquitetura | 🗂️ 8. Estrutura | ✅ 9. Pré-requisitos |
| ⚙️ 10. Instalação e execução | 🔐 11. Variáveis de ambiente | 🔌 12. API |
| 🗄️ 13. Banco de dados | 🧪 14. Testes | 🚀 15. Deploy e CI/CD |
| 🛡️ 16. Segurança | 🤝 17. Contribuição | 🐛 18. Limitações e problemas |

---

## 🎯 1. Objetivo

Monitorar uma ou várias máquinas com **dados reais**, coletados continuamente, e apresentá-los como uma **fazenda interativa em pixel art** 🌻, sem abrir mão do que um monitor de sistema tradicional oferece: 🔢 números, 📈 histórico e 🔔 alertas.

## 🤔 2. Problema

Monitores de sistema comuns (Gerenciador de Tarefas, `htop`…) são tabelas e gráficos frios 🥶: pouca gente fica de olho neles, e problemas como 💽 disco quase cheio, 🌡️ CPU superaquecendo ou 🧠 memória no limite passam despercebidos até o computador travar.

O Stardew Monitor deixa esses sinais **visíveis e agradáveis de acompanhar** 👀: se a fazenda está ensolarada e as galinhas felizes 🐔, está tudo bem; se cai uma tempestade ⛈️ ou o silo transborda, algo precisa de atenção. E, quando for sério, ele **avisa por Discord, Telegram ou e-mail** 📣.

## 📐 3. Escopo

**✅ Dentro do escopo**
- 🔍 Coleta de CPU (total, núcleos, temperatura), RAM e swap, discos, E/S de disco, rede, GPU, ventoinhas, bateria, uptime e processos;
- 🌾 Fazenda em pixel art com estações 🍂, ciclo dia/noite 🌙, clima reativo ⛅, animais 🐄 e festivais 🎉;
- 🔔 Alertas configuráveis, com envio por 💬 Discord, ✈️ Telegram e ✉️ e-mail;
- 📈 Histórico de 15 minutos a 30 dias, 🏆 conquistas, 📖 diário e 📜 quadro de missões;
- 🧑‍🌾 Página de processos ("moradores"), com opção de encerrar ("expulsar") de forma protegida;
- 🏘️ Várias máquinas da mesma rede com o agente (opcional);
- 📦 Aplicativo baixável (executável único) para Windows e Linux.

**❌ Fora do escopo**
- 🔑 Login, contas de usuário ou acesso pela internet;
- ☁️ Modo "hospedado": um site não consegue ler o hardware de quem o visita;
- 🎲 Dados fictícios: sensor ausente aparece como "indisponível", nunca com um valor inventado.

## 🧑‍🌾 4. Como funciona

### 🗺️ 4.1 Como usar em 5 passos

<p align="center">
  <img src="img/como-usar.svg" alt="Como usar: abrir o site, baixar o exe, dois cliques, navegador abre em localhost:3001, fazenda ao vivo" width="100%">
</p>

### 🌐 4.2 O site no Netlify: a página de entrada

O site publicado contém **só a interface, sem o servidor** ☁️, então ele **não mostra dados de ninguém**. Quando é aberto fora do aplicativo, ele vira uma página de entrada que:

1. 📖 explica por que o monitor precisa rodar no computador;
2. 🔎 **procura o aplicativo aberto** no seu PC, testando `localhost:3001` a `3005` (o navegador pode pedir permissão para acessar a rede local);
3. ✅ se encontrar, mostra o botão **"Abrir meu painel"**;
4. ⬇️ se não encontrar, oferece o download do `.exe` (detectando o seu sistema operacional).

<p align="center">
  <img src="img/mockup-site-netlify.svg" alt="Ilustração da página de entrada no Netlify" width="100%">
  <br><sub>🖼️ Ilustração da página de entrada (stardewmonitor.netlify.app)</sub>
</p>

### 🏡 4.3 O painel: a fazenda ao vivo

Com o aplicativo aberto, o navegador mostra a fazenda **deste** computador em `http://localhost:3001`. Clique em cada construção 🖱️ para ver os detalhes reais. O menu leva às outras páginas: 🏘️ Pelican Town, 📈 Histórico, 🧑‍🌾 Moradores, 📖 Diário, 📜 Missões, 🏆 Conquistas, 🔔 Avisos e ⚙️ Ajustes.

<p align="center">
  <img src="img/mockup-painel.svg" alt="Ilustração do painel com a fazenda, barras de recursos, recado, conquista, missões e último aviso" width="100%">
  <br><sub>🖼️ Ilustração do painel em localhost:3001</sub>
</p>

### 🔄 4.4 Como o computador vira fazenda

As regras de conversão ficam em `shared/src/farm.js` (função pura e testada `computeFarmState`):

<p align="center">
  <img src="img/como-o-pc-vira-fazenda.svg" alt="Tabela de conversão: CPU vira casa, RAM vira plantação, discos viram silos, rede vira carroça, GPU vira moinho, e assim por diante" width="100%">
</p>

### ⛅ 4.5 Clima reativo

O céu reflete a carga e a temperatura da CPU. A prioridade é: tempestade › onda de calor › calor › chuva › nublado › sol. Os limites mudam em **Ajustes › Clima**.

<p align="center">
  <img src="img/clima-reativo.svg" alt="Seis climas: ensolarado, nublado, chuva, tempestade, dia quente e onda de calor, com os limites de cada um" width="100%">
</p>

### 🍂 4.6 Estações e festivais

São 4 estações, pela data real (hemisfério sul ou norte) ou por um calendário próprio de 28 dias por estação, com festivais que trazem decorações temporárias. As datas são configuráveis, inclusive relativas à Páscoa 🥚.

<p align="center">
  <img src="img/estacoes-festivais.svg" alt="As quatro estações e seus festivais" width="100%">
</p>

### 🏘️ 4.7 Pelican Town: várias máquinas

Cada máquina monitorada vira uma casinha no mapa, colorida pelo estado: 🟢 ok · 🟡 aviso · 🔴 crítico · ⚪ sem sinal.

<p align="center">
  <img src="img/pelican-town.svg" alt="Mapa Pelican Town com quatro casas: verde, amarela, vermelha e cinza" width="100%">
</p>

## 📋 5. Requisitos

### ⚙️ 5.1 Requisitos funcionais

| ID | Requisito | 📍 Onde no código |
|---|---|---|
| 🔍 RF01 | Coletar CPU, RAM e swap, discos, E/S, rede, GPU, ventoinhas, bateria, uptime e processos, tratando sensores indisponíveis | `agent/src/collector` |
| 🌾 RF02 | Representar cada recurso como elemento da fazenda | `shared/src/farm.js`, `frontend/src/farm` |
| ⛅ RF03 | Estações, ciclo dia/noite e clima reativo com limites configuráveis | `shared/src/seasons.js`, `farm.js` |
| 🐔 RF04 | Animais como indicadores de saúde, sem substituir os números | `frontend/src/farm/Animals.jsx` |
| 🏆 RF05 | Conquistas persistentes com progresso, histórico e data | `backend/src/services/achievements.js` |
| 🎉 RF06 | Festivais automáticos por data configurável, com decorações | `seasons.js`, `Weather.jsx` |
| 🔔 RF07 | Alertas por categoria, sem repetição, com intervalo mínimo e envio por Discord, Telegram e e-mail | `shared/src/alerts.js`, `backend/src/notifier/` |
| 💬 RF08 | Cartão de status com mensagens contextuais | `shared/src/messages.js` |
| 🧑‍🌾 RF09 | Processos com ordenação, filtros e pesquisa; encerramento confirmado, só local, protegido e auditado | `ProcessesPage.jsx`, `services/processes.js` |
| 📖 RF10 | Diário com categorias, pesquisa, histórico por data e salvamento automático | `DiaryPage.jsx`, `routes/journal.js` |
| 🎨 RF11 | Temas: Padrão, Floresta, Praia, Colina, Gengibre e Minas | `farm/palette.js`, `styles/base.css` |
| 🏘️ RF12 | Várias máquinas com agente, tokens individuais e mapa Pelican Town | `agent/`, `TownPage.jsx` |
| 📈 RF13 | Histórico de 15 min a 30 dias, com agregação | `services/history.js`, `HistoryPage.jsx` |
| 📜 RF14 | Quadro de Missões (tarefas, inclusive diárias) | `QuestsPage.jsx` |
| ♻️ RF15 | Compatibilidade com a versão 2 (`/api/dados` e hospedagem PHP) | `routes/public.js`, `legacy/` |
| 📦 RF16 | Aplicativo baixável que coleta os dados do próprio computador, sem login | `app/`, `scripts/build-app.mjs` |

### 🛡️ 5.2 Requisitos não funcionais

| ID | Requisito |
|---|---|
| 🔐 RNF01 | **Segurança:** painel só local (127.0.0.1), proteção contra CSRF e DNS rebinding, rate limiting, validação com zod, HMAC nos agentes, segredos criptografados (AES-256-GCM) e auditoria. |
| ⚡ RNF02 | **Desempenho:** coleta em camadas, agregação incremental e interface leve (~50 KB de JS comprimido). |
| 💻 RNF03 | **Compatibilidade:** Windows e Linux (macOS quando possível); SQLite e PostgreSQL. |
| ♿ RNF04 | **Acessibilidade:** fazenda navegável por teclado e com descrições, gráficos com alternativa em tabela, `prefers-reduced-motion`. |
| 🧩 RNF05 | **Manutenibilidade:** módulos separados, regras puras testáveis em `shared/`, migrations e CI. |
| 🎯 RNF06 | **Honestidade dos dados:** nenhum valor aleatório; sensor ausente é `null` e aparece como "indisponível". |
| 🕵️ RNF07 | **Privacidade:** nada sai do computador além das notificações configuradas; sem telemetria. |

## 🧰 6. Tecnologias

| Camada | Tecnologia | 🔧 Uso |
|---|---|---|
| 🟢 Runtime | **Node.js 22.13+** (recomendado 24) | Backend, agente e executável único (*Single Executable Applications*) |
| ⚙️ Backend | **Express** + Helmet + zod | API REST, SSE, validação e cabeçalhos de segurança |
| 🎨 Frontend | **Preact** + **Vite** | Interface, fazenda em SVG e gráficos próprios (`PixelChart`) |
| 🔤 Fontes | *Press Start 2P* e *VT323* (embutidas) | Visual retrô, sem CDN |
| 🔊 Áudio | Web Audio API | Efeitos e música 8 bits gerados no navegador |
| 🔍 Coleta | `systeminformation` + leituras do SO | `/proc`, `hwmon`, contadores do Windows, `nvidia-smi`, LibreHardwareMonitor |
| 🗄️ Banco | **SQLite** (`node:sqlite`) ou **PostgreSQL** (`pg`) | Persistência com migrations |
| 📦 Monorepo | npm workspaces | `shared`, `database`, `agent`, `backend`, `frontend` |
| 🧪 Testes | `node:test` + `supertest` | Unitários, API e persistência |
| 🧹 Qualidade | ESLint 9 | Lint |
| 🐳 Contêiner | Docker + Docker Compose | Alternativa ao aplicativo |
| 🤖 CI/CD | GitHub Actions | Lint, testes, build, Docker, executáveis e release |
| ☁️ Hospedagem | Netlify | Só a página de entrada |

## 🏛️ 7. Arquitetura

<p align="center">
  <img src="img/arquitetura-stardew.svg" alt="Arquitetura: no computador, o coletor envia snapshots ao backend Express, que grava no SQLite e envia SSE ao navegador; Netlify só verifica localhost; GitHub hospeda o executável" width="100%">
</p>

### 🧩 Módulos

| Módulo | 🎯 Responsabilidade | Depende de |
|---|---|---|
| 📐 `shared/` | Regras puras, sem E/S: snapshot, métricas → fazenda, alertas, estações, festivais, conquistas e mensagens | — |
| 🔍 `agent/` | Coletor multiplataforma e o agente (buffer, envio assinado, comandos) | shared |
| 🗄️ `database/` | Adaptadores SQLite e PostgreSQL com a mesma interface; migrations | — |
| ⚙️ `backend/` | Express: proteção local, API, SSE, ingestão, histórico, alertas, notificações, conquistas e agendador | shared, agent, database |
| 📦 `app/` | Aplicativo baixável: abre o servidor local e o navegador | backend |
| 🎨 `frontend/` | Preact + Vite: fazenda em SVG, páginas, gráficos e sons | shared |

### 🔄 Fluxo de dados

<p align="center">
  <img src="img/fluxo-dados.svg" alt="Fluxo: coleta, ingestão, alertas e conquistas, SSE, computeFarmState e fazenda" width="100%">
</p>

1. 🔍 **Coleta:** o mesmo `Collector` roda no servidor (monitor local embutido) e em cada agente. CPU, memória, rede, E/S e GPU vêm em toda leitura; discos e bateria a cada 30 s; dados estáticos a cada 10 min.
2. 📥 **Ingestão** (`IngestService`): grava a leitura bruta → atualiza o estado ao vivo (médias de CPU de 1 e 5 min) → avalia alertas → atualiza conquistas → envia aos navegadores por SSE.
3. ⏲️ **Agregação** (a cada minuto): médias e máximos por minuto e por hora.
4. 🧹 **Retenção** (a cada hora): apaga leituras brutas com mais de 26 h, minutos com mais de 8 dias e horas com mais de 400 dias (configurável).
5. 🌾 **Interface:** `computeFarmState` transforma o snapshot no estado visual da fazenda.

### 🧠 Decisões de projeto

| Decisão | 🤔 Por quê |
|---|---|
| 📡 **SSE** em vez de WebSocket | O fluxo é só servidor → navegador; SSE é mais simples e reconecta sozinho |
| 🗄️ **SQLite nativo do Node** | Nada para compilar no Windows; PostgreSQL fica para muitas máquinas |
| 🔁 **Monitor local = agente embutido** | Um único caminho de ingestão, testado uma vez |
| 🔒 **Sem login, só local** | O servidor escuta em 127.0.0.1 e recusa outros `Host`/`Origin` |
| 📦 **Executável único** | Quem baixa não precisa instalar Node.js |

## 🗂️ 8. Estrutura do projeto

```
📁 Stardew-Monitor/
├── 📦 app/              # aplicativo baixável (abre o servidor local e o navegador)
├── 🛠️ scripts/          # geração do executável (build-app.mjs)
├── ⚙️ backend/          # API Express, SSE, alertas, conquistas, histórico, proteção local
├── 🔍 agent/            # agente leve + coletor de métricas multiplataforma
├── 🎨 frontend/         # Preact + Vite: fazenda em SVG, páginas, gráficos, sons
│   └── src/
│       ├── 🌾 farm/     # cena: Buildings, Field, Animals, Weather, sprites, paleta
│       ├── 📄 pages/    # Fazenda, Town, Histórico, Moradores, Diário, Missões...
│       ├── 🔌 services/ # api, live (SSE + polling), store, router
│       └── 🔊 audio/    # efeitos e música 8 bits (Web Audio)
├── 🗄️ database/         # adaptadores SQLite/PostgreSQL e migrations
├── 📐 shared/           # regras puras: métricas → fazenda, estações, alertas...
├── 🧪 tests/            # unitários, API e persistência (node:test)
├── 📚 docs/             # documentação detalhada
├── 🕰️ legacy/           # versão 2 (painel antigo e modo hospedagem PHP)
├── ⚙️ .github/workflows/ci.yml
├── 🐳 Dockerfile · docker-compose.yml
└── 🔐 .env.example
```

## ✅ 9. Pré-requisitos

| Item | 🔢 Versão | Quando é necessário |
|---|---|---|
| 💻 Windows 10/11 ou Linux | — | ✅ Sempre (macOS com suporte parcial) |
| 🌐 Navegador moderno | Versões atuais | ✅ Sempre |
| 🟢 Node.js | **22.13+** (recomendado 24) | 🧑‍💻 Só para rodar pelo código-fonte |
| 📦 npm | 10+ | 🧑‍💻 Só para rodar pelo código-fonte |
| 🌿 Git | 2.x+ | 🧑‍💻 Só para clonar |
| 🐘 PostgreSQL | 14+ | ➖ Opcional (várias máquinas) |
| 🐳 Docker | Atual | ➖ Opcional |
| 🌡️ LibreHardwareMonitor | Atual | ➖ Opcional: temperatura e ventoinhas no Windows |

## ⚙️ 10. Instalação e execução

### ⬇️ Opção A: aplicativo baixável (recomendado)

1. ⬇️ Baixe o [`StardewMonitor-windows-x64.exe`](https://github.com/Milkaarz/Stardew-Monitor/raw/main/release/StardewMonitor-windows-x64.exe) na pasta [`release`](https://github.com/Milkaarz/Stardew-Monitor/tree/main/release) (clique em **Download raw**);
2. 🖱️ Dê **dois cliques** no arquivo. Não precisa instalar nada, nem Node.js;
3. 🧭 O navegador abre sozinho em **http://localhost:3001**;
4. ❌ Para encerrar, feche a janela do aplicativo.

> ⚠️ Na primeira vez, o Windows pode mostrar "O Windows protegeu o computador" (o executável não tem assinatura digital paga). Clique em **Mais informações → Executar assim mesmo**.

💾 Os dados ficam em `%LOCALAPPDATA%\StardewMonitor` (Windows) ou `~/.local/share/stardew-monitor` (Linux).

### 🧑‍💻 Opção B: pelo código-fonte

```bash
# 1️⃣ Clonar o repositório
git clone https://github.com/Milkaarz/Stardew-Monitor.git

# 2️⃣ Acessar a pasta
cd Stardew-Monitor

# 3️⃣ Instalar dependências (todos os workspaces)
npm install

# 4️⃣ (Opcional) Configurar variáveis
cp .env.example .env

# 5️⃣ Compilar a interface e iniciar
npm run build
npm start
```

🌐 **6️⃣ Acessar:** http://localhost:3001

Na primeira execução: 🗄️ as migrations criam as tabelas, 🔑 um segredo é gerado na pasta de dados e 🔍 o monitor local começa a coletar a cada 5 s.

### 🛠️ Scripts úteis

| Script | O que faz |
|---|---|
| `npm start` | ▶️ Servidor de produção (API + interface) |
| `npm run dev` | 🔁 Backend com recarga em http://localhost:3001 |
| `npm run dev:web` | ⚡ Interface com recarga instantânea em http://localhost:5173 |
| `npm run build` | 🏗️ Compila a interface |
| `npm run agent` | 🔍 Roda o agente (outras máquinas) |
| `npm run migrate` | 🗄️ Aplica migrations pendentes |
| `npm run app:build` | 📦 Gera o executável em `release/` |
| `npm run check` | ✅ lint + testes + build |

### 🩺 Como validar o ambiente
- ✅ `curl http://localhost:3001/api/health` responde `{ "ok": true, "app": "stardew-monitor", ... }`;
- 🌾 A fazenda mostra números e o status diz "atualizado há poucos segundos";
- 🔥 Abra um programa pesado: a fumaça da chaminé aumenta e o céu fica nublado.

### 🧯 Erros comuns
| 😵 Sintoma | 🔍 Causa provável | 🛠️ Solução |
|---|---|---|
| 🌡️ Temperatura "indisponível" no Windows | O Windows não expõe o sensor | Abra o **LibreHardwareMonitor** como administrador e deixe-o aberto |
| 🎮 GPU sem % de uso | Placa não NVIDIA no Windows | Limitação conhecida; nome e VRAM continuam aparecendo |
| 🛑 "O Windows protegeu o computador" | Executável sem assinatura digital | Mais informações → Executar assim mesmo |
| 🌐 Site do Netlify não acha o app | App fechado ou o navegador bloqueou a rede local | Abra o app e clique em "Verificar de novo", ou vá direto a localhost:3001 |
| ❌ `npm install` falha | Node.js antigo | Atualize para 22.13+ |

## 🔐 11. Variáveis de ambiente

Copie `.env.example` para `.env`. **Todas são opcionais** (os valores abaixo são os padrões). O aplicativo baixável não precisa desse arquivo.

> 🚫 O `.env` **nunca** vai para o Git (está no `.gitignore`). Versione só o `.env.example`, com valores de exemplo.

| Variável | Padrão | 📝 Para quê |
|---|---|---|
| `PORT` | `3001` | 🔌 Porta HTTP |
| `HOST` | `127.0.0.1` | 🔒 Interface de rede (`0.0.0.0` só para receber agentes) |
| `ALLOWED_HOSTS` | — | 🏷️ Nomes extras aceitos no endereço do painel |
| `DATA_DIR` | `./data` | 📁 Pasta do banco SQLite e do segredo gerado |
| `DATABASE_URL` | `sqlite:./data/stardew.db` | 🗄️ `sqlite:arquivo.db` ou `postgres://usuario:senha@host:5432/stardew` |
| `APP_SECRET` | gerado | 🔑 Criptografa as credenciais salvas pelo painel (≥ 32 caracteres) |
| `LOCAL_MONITOR` / `LOCAL_INTERVAL` | `true` / `5` | 🔍 Monitorar esta máquina / segundos entre leituras |
| `ALLOW_PROCESS_KILL` | `true` | 🧑‍🌾 Permitir "Expulsar morador" |
| `PROTECTED_PROCESSES` | — | 🛡️ Processos extras que nunca podem ser encerrados |
| `RATE_LIMIT_*` | 600 / 240 / 10 | 🚦 Limites por minuto (API / agentes / encerrar processo) |
| `DISCORD_WEBHOOK_URL` | — | 💬 Notificações no Discord |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | — | ✈️ Notificações no Telegram |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO` | — | ✉️ Notificações por e-mail |
| `STARDEW_SERVER_URL`, `STARDEW_AGENT_TOKEN` | — | 🏘️ Configuração do agente em outras máquinas |

```env
# Exemplo seguro (sem segredos reais)
PORT=3001
HOST=127.0.0.1
DATABASE_URL=sqlite:./data/stardew.db
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/sua_url_aqui
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

🎛️ Quase tudo também pode ser ajustado pelo painel, em **⚙️ Ajustes** (estações, clima, conquistas, festivais, retenção, tema, sons) e **🔔 Avisos** (limites e canais, com botão de teste).

## 🔌 12. API

Base: `/api` · respostas em JSON · documentação completa em [`docs/api.md`](https://github.com/Milkaarz/Stardew-Monitor/blob/main/docs/api.md).

🔒 **Acesso:** sem login. O painel só responde em `localhost`, e toda alteração (POST/PUT/PATCH/DELETE) exige o cabeçalho `X-Stardew-Monitor: 1`.

| Método | Rota | 📝 Descrição |
|---|---|---|
| GET | `/health` | 🩺 Status do servidor |
| GET | `/metrics?machine=` | 📊 Leitura atual + médias recentes |
| GET | `/history?range=15m\|1h\|6h\|24h\|7d\|30d` | 📈 Série histórica (média e máximo) |
| GET | `/stream` | 📡 Tempo real (Server-Sent Events) |
| GET / POST / PATCH / DELETE | `/machines[/:id]` | 🏘️ Fazendas (máquinas) e tokens |
| GET | `/processes?sort=&limit=&q=&filter=` | 🧑‍🌾 Processos ("moradores") |
| POST | `/processes/kill` | 🚪 "Expulsar morador" (`confirm: true`, só local) |
| GET / POST / PUT / DELETE | `/notes[/:id]` | 📖 Diário |
| GET / POST / PATCH / DELETE | `/quests[/:id]` | 📜 Quadro de Missões |
| GET | `/achievements` | 🏆 Conquistas e progresso |
| GET / DELETE | `/notifications` | 🔔 Histórico de avisos |
| POST | `/notifications/test/:channel` | 🧪 Testa `discord`, `telegram` ou `email` |
| GET / PUT / DELETE | `/settings[/:section]` | ⚙️ Configurações (segredos nunca são devolvidos) |
| PUT | `/secrets` | 🔑 Grava credenciais (só escrita) |
| POST | `/agent/metrics` | 🔍 Recebe leituras de agentes (Bearer + HMAC) |

```bash
curl http://localhost:3001/api/metrics          # 📊 leitura atual
curl -N http://localhost:3001/api/stream        # 📡 eventos ao vivo
curl -X POST -H 'X-Stardew-Monitor: 1' -H 'Content-Type: application/json' \
     -d '{"text":"Limpar a poeira"}' http://localhost:3001/api/quests   # 📜 nova missão
```

📡 **Eventos SSE:** `hello` (estado inicial), `metrics` (nova leitura), `machine`, `notification`, `achievement`, `command` e `settings`.

## 🗄️ 13. Banco de dados

🗄️ **SQLite** por padrão (arquivo `stardew.db`, sem instalar nada) ou **PostgreSQL** para muitas máquinas. Os dois usam o mesmo esquema, as migrations rodam sozinhas ao iniciar e ambos são testados no CI.

| Tabela | 📝 Conteúdo |
|---|---|
| `machines` | 🏘️ Fazendas: nome, tema, hash do token, status, hardware |
| `metrics_raw` | 📊 Leituras brutas (chave máquina + horário: reenvio não duplica) |
| `metrics_agg` | 📈 Média e máximo por minuto e por hora |
| `machine_state` | 🧮 Contadores das conquistas |
| `achievements` | 🏆 Conquistas desbloqueadas |
| `notifications` | 🔔 Avisos e resultado da entrega em cada canal |
| `notes`, `quests` | 📖 Diário e 📜 Missões |
| `settings`, `secrets` | ⚙️ Configurações e 🔑 credenciais criptografadas (AES-256-GCM) |
| `audit_log` | 🧾 Alterações e tentativas de encerrar processos |
| `agent_commands` | 📨 Fila de comandos para agentes |

| | SQLite | PostgreSQL |
|---|---|---|
| Instalação | ✅ nenhuma | 🐘 servidor ou serviço gerenciado |
| Ideal para | 💻 1 máquina | 🏘️ muitas máquinas com agentes |
| Backup | 📋 copiar `stardew.db` | 💾 `pg_dump` |

## 🧪 14. Testes

```bash
npm run lint      # 🧹 ESLint
npm test          # 🧪 unitários + API + persistência (SQLite)
npm run test:pg   # 🐘 persistência + API no PostgreSQL
npm run build     # 🏗️ build da interface
npm run check     # ✅ tudo junto (rode antes de abrir um PR)
```

| Arquivo | 🎯 O que cobre |
|---|---|
| `tests/unit/farm.test.js` | 🌾 Conversão de métricas em fazenda (plantação, fumaça, carroça, moinho, clima, animais) |
| `tests/unit/alerts.test.js` | 🔔 Limites, sustentação, intervalo mínimo, agravamento e recuperação |
| `tests/unit/seasons-messages.test.js` | 🍂 Estações, dia/noite, Páscoa, festivais, mensagens e conquistas |
| `tests/unit/collector.test.js` | 🔍 Leitores de cada SO, proteção de processos e uma coleta real |
| `tests/unit/agent.test.js` | 🔏 Assinatura agente↔servidor, buffer offline e comandos |
| `tests/unit/frontend.test.js` | 🎨 Paleta da cena em todos os temas, estações e horários |
| `tests/api/local.test.js` | 🔒 Só localhost, anti-CSRF, anti-DNS rebinding, expulsão só local |
| `tests/api/api.test.js` | 🔌 Todos os endpoints, agentes, histórico, alertas, segredos e processos |
| `tests/integration/persistence.test.js` | 🗄️ Migrations, deduplicação, agregação, retenção e reinício |

## 🚀 15. Deploy e CI/CD

### ☁️ Site (Netlify)
O site publicado é a **página de entrada** (interface sem servidor). Cada push no GitHub faz o Netlify publicar de novo 🔁.

### 📦 Publicar uma nova versão do executável
```bash
npm run app:build
git add -f release/StardewMonitor-windows-x64.exe   # -f: release/ está no .gitignore
git commit -m "Atualiza o aplicativo"
git push
```
O botão de download do site aponta para esse arquivo, então a versão nova fica disponível assim que o push chega ao GitHub (o limite por arquivo é de 100 MB).

### 🐳 Docker (alternativa)
```bash
docker compose up -d                        # SQLite; porta publicada só em 127.0.0.1
docker compose --profile postgres up -d     # com PostgreSQL
```
⚠️ Dentro do contêiner, o monitor enxerga o contêiner, não o seu PC. Para o seu computador, prefira o aplicativo.

### 🤖 Integração contínua (GitHub Actions)

<p align="center">
  <img src="img/ci-pipeline.svg" alt="Pipeline do GitHub Actions: test em matriz, postgres, docker, app e release" width="100%">
</p>

| Job | ⚙️ O que faz |
|---|---|
| 🧪 `test` | Ubuntu (Node 22 e 24) e Windows (Node 24): `npm ci` → lint → testes → build |
| 🐘 `postgres` | Suíte de persistência e API com PostgreSQL 17 |
| 🐳 `docker` | Build das imagens do servidor e do agente |
| 📦 `app` | Gera os executáveis (Windows e Linux) e testa se sobem e respondem em `/api/health` |
| 🚀 `release` | Em tags `v*`: cria a Release do GitHub com os executáveis |

## 🛡️ 16. Segurança

- 🔒 **Painel só local:** escuta em `127.0.0.1`; o cabeçalho `Host` precisa ser `localhost` (proteção contra *DNS rebinding*).
- 🛑 **Anti-CSRF:** alterações exigem `X-Stardew-Monitor`, e o servidor nunca libera CORS.
- 🚦 **Rate limiting:** 600/min (geral), 240/min (agentes), 10/min (encerrar processos).
- 🧾 **Validação:** toda entrada passa por esquemas zod.
- 🔑 **Segredos:** credenciais criptografadas com AES-256-GCM; a API nunca devolve os valores, só se estão "configurados".
- 🔏 **Agentes:** token individual (o servidor guarda só o hash SHA-256) e assinatura HMAC-SHA256 com proteção contra replay.
- 🚪 **Expulsar morador:** exige pedido local, confirmação explícita, PID conferido e processo não essencial. Toda tentativa vai para a auditoria.

> ⚠️ Não exponha o painel à internet: como não tem login, qualquer pessoa que o alcançasse poderia alterar as configurações.

## 🤝 17. Como contribuir

1. 🍴 Faça um *fork* e crie uma branch: `git checkout -b feature/nome-da-melhoria`;
2. 📐 Regras de negócio novas vão em `shared/` (funções puras e testáveis);
3. 🗄️ Mudança no banco = **nova** migration em `database/migrations/` (nunca edite uma já publicada);
4. 🎯 Sensor ausente = `null`. Nunca preencha com valores fictícios;
5. ✅ Rode `npm run check` antes de abrir o **Pull Request** 🔀;
6. 📸 Para mudanças visuais, anexe prints ao PR.

📄 Veja também `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` e `SECURITY.md` no repositório.

## 🐛 18. Limitações conhecidas e problemas encontrados

### ⚠️ Limitações
- 🌡️ **Temperatura e ventoinhas no Windows** só aparecem com o LibreHardwareMonitor aberto (no Linux vêm do `hwmon`).
- 🎮 **Uso da GPU:** NVIDIA via `nvidia-smi`; AMD/Intel só no Linux. Outras placas mostram só nome e VRAM.
- 👤 **Dono do processo** não aparece no Windows sem privilégios de administrador.
- 🐳 Em contêineres, o monitor enxerga o contêiner, não o host.
- ☁️ O site do Netlify **não mostra dados**: o painel só funciona pelo aplicativo, em `localhost`.
- 🛑 O executável não tem assinatura digital, então o SmartScreen e alguns antivírus pedem confirmação.

### 🚨 Problema encontrado ao revisar o repositório

O `.gitignore` exclui a pasta `data/`, mas estes arquivos de execução **estão commitados** na branch `main` (commit "New version no login", 17/11/2026):

| Arquivo | 🤔 Risco |
|---|---|
| 🔑 `data/.app-secret` | É a chave que criptografa as credenciais (Discord, Telegram, SMTP). Com ela pública, essa criptografia deixa de proteger. |
| 🗄️ `data/stardew.db`, `stardew.db-wal`, `stardew.db-shm` | Banco local: pode conter nome da máquina, hardware, processos, diário e credenciais criptografadas com a chave acima. |

O conteúdo desses arquivos não foi aberto nesta revisão. É exatamente o caso de **"o que NÃO colocar na documentação/repositório"** da aula. Correção recomendada:

```bash
git rm --cached -r data/          # tira do repositório, mantém no disco
git commit -m "Remove dados locais e segredo do repositório"
git push
```

Depois disso:
1. 🔄 **Gerar um segredo novo:** apague o `.app-secret` local (ou defina `APP_SECRET`) e cadastre de novo as credenciais no painel, porque o segredo antigo continua no histórico do Git;
2. 🔁 **Trocar as credenciais** (webhook do Discord, token do Telegram, senha SMTP), se alguma tiver sido salva com aquele segredo;
3. 🧹 **(Opcional) Limpar o histórico** com `git filter-repo` ou BFG, se o banco tiver dados pessoais.

A pasta `build/` (cerca de 5 MB de artefatos) também está no repositório apesar do `.gitignore`. Não é um risco de segurança, mas pode ser removida da mesma forma.

---

## 👥 Autoria

Repositório mantido por **Milkaarz**, com o painel e o modo agente desenvolvidos por **MizzieWiller**. Criado como projeto integrador da 🏫 **Fatec Itapetininga**, curso de Análise e Desenvolvimento de Sistemas.

📄 Licença: **MIT**.

<p align="center">🌾 Que a sua fazenda tenha sempre céu limpo e silos vazios ☀️🐔🌻</p>
