# 🌾 Stardew Monitor

Monitor de hardware e recursos do sistema com visual de fazenda em pixel art. Cada recurso real do computador vira um elemento da fazenda: a **casa** é a CPU, a **plantação** é a RAM, o **celeiro e os silos** são os discos, a **carroça e o correio** são a rede, o **moinho** é a GPU, o **clima** reage à temperatura e à carga, a **estamina** é a bateria e os **dias na fazenda** são o tempo ligado.

Não é só ilustração: todos os números vêm de leituras reais, guardadas em banco de dados, com alertas, histórico, conquistas, diário e monitoramento de várias máquinas.

> Projeto de fã, inspirado na estética de jogos de fazenda em pixel art. Toda a arte é original, desenhada em código (SVG); nenhum recurso de jogo é usado.

**📍 Demo da versão 2 (modo agente + hospedagem PHP):** [https://mizzie.nyx.dev.br/stardew/](https://mizzie.nyx.dev.br/stardew/)

---

## ✨ O que tem

| Área | Funcionalidades |
|---|---|
| 🏡 **Fazenda** | Cena interativa em pixel art; clique em cada construção para ver os detalhes reais. Fumaça da chaminé pela CPU, canteiros pela RAM, grãos nos silos pelos discos, pás do moinho pela GPU, carroça pela rede, vento pelas ventoinhas. |
| ⛅ **Ambiente** | 4 estações (data real nos hemisférios norte/sul ou calendário próprio de 28 dias), ciclo dia/noite pelo horário local, clima reativo (sol, nublado, chuva, tempestade, calor) com limites configuráveis. |
| 🐔 **Animais** | Galinhas felizes/assustadas (saúde geral), vacas descansando (ociosidade), porcos fuçando (E/S de disco), patos no lago (tudo normal). Os números continuam sempre visíveis. |
| 🔔 **Alertas** | Limites individuais (CPU, RAM, disco, temperatura, GPU, bateria, máquina sem sinal), tempo de sustentação, sem repetição, intervalo mínimo, avisos de recuperação. Envio por **Discord**, **Telegram** e **e-mail**. Sons 8 bits opcionais (desligados por padrão). |
| 📈 **Histórico** | Gráficos de CPU, RAM, GPU, temperatura, rede e disco: 15 min, 1 h, 6 h, 24 h, 7 dias e 30 dias, com agregação por minuto/hora e retenção configurável. |
| 🧑‍🌾 **Moradores** | Processos com ordenação, filtros, pesquisa e 10/25/50/100 resultados. **Expulsar morador** (encerrar processo) só para administrador, com senha, confirmação, proteção de processos essenciais e auditoria. |
| 🏘️ **Pelican Town** | Mapa com uma casinha por máquina: verde, amarelo, vermelho ou cinza (sem sinal). Agente leve com token individual para cada máquina. |
| 🏆 **Conquistas** | Persistentes, com progresso e data: Fazendeiro Dedicado, Veterano da Fazenda, Colheita Recorde, Fazenda Organizada, Dia Tranquilo, Máquina Incansável e outras. |
| 🎉 **Festivais** | Festival do Ovo, Dança das Flores, Luau de Verão, Noite dos Espíritos, Festival da Lua Gelada e Festival das Estrelas, com decorações temporárias e datas configuráveis. |
| 📖 **Diário** | Changelog da máquina: categorias, pesquisa, histórico por data e salvamento automático. Mais o **Quadro de Missões** (tarefas, com missões diárias). |
| 🎨 **Temas** | Fazenda Padrão, da Floresta, da Praia, da Colina, de Gengibre e Minas (interface escura). |
| 🔒 **Segurança** | Login, papéis (administrador/visitante), CSRF, rate limiting, validação de tudo que entra, tokens de agente com assinatura HMAC, segredos criptografados, auditoria. |

## 🚀 Início rápido

Requisitos: **Node.js 22.13 ou superior** (usa o SQLite nativo do Node) e npm.

```bash
git clone https://github.com/Milkaarz/Stardew-Monitor.git
cd Stardew-Monitor
npm install
npm run build          # compila a interface
cp .env.example .env   # opcional: defina ADMIN_PASSWORD (mín. 10 caracteres)
npm start
```

Abra **http://localhost:3001** e entre com `admin` e a senha de `ADMIN_PASSWORD` — ou a senha gerada que aparece **uma vez** no log da primeira inicialização.

Com Docker:

```bash
cp .env.example .env   # defina ADMIN_PASSWORD e APP_SECRET
docker compose up -d
```

## 🖥️ Local x hospedado: leia antes de publicar

O servidor monitora **a máquina onde ele roda**. Se você hospedar o painel na nuvem (Render, Railway, uma VPS…), a "Fazenda Principal" mostrará o **servidor da hospedagem**, não o seu computador. Serviços como Vercel e Render não conseguem enxergar o hardware do seu PC.

Para monitorar seu PC (ou vários), rode o **agente** em cada máquina: ele coleta localmente e envia para o servidor central. Veja [docs/deploy.md](docs/deploy.md) e [docs/agente.md](docs/agente.md).

```
 Seu PC ──agente──┐
 Notebook ─agente─┼──HTTPS──▶ Servidor central (API + painel + banco) ◀── navegador
 Servidor ─agente─┘
```

## 📁 Estrutura

```
backend/    API Express, SSE em tempo real, alertas, conquistas, histórico, autenticação
agent/      agente leve + coletor de métricas multiplataforma (usado também pelo backend)
frontend/   interface Preact + Vite: fazenda em SVG, páginas, gráficos, sons
database/   adaptadores SQLite/PostgreSQL e migrations
shared/     regras puras: métricas -> fazenda, estações, festivais, alertas, conquistas, mensagens
tests/      testes unitários, de API e de persistência (node:test)
docs/       documentação
legacy/     versão 2 (painel antigo e modo hospedagem PHP), preservada
```

## 📚 Documentação

- [Instalação e configuração](docs/instalacao.md)
- [Agente de monitoramento](docs/agente.md)
- [Deploy: local, Docker, nuvem e PostgreSQL](docs/deploy.md)
- [API REST e tempo real](docs/api.md)
- [Arquitetura](docs/arquitetura.md) e [diagramas](docs/diagramas.md)
- [Segurança](docs/seguranca.md)
- [Desenvolvimento, testes e CI](docs/devops.md)
- [Projeto: escopo e requisitos](docs/projeto.md)
- [Modo legado (hospedagem PHP)](docs/legado-php.md)
- [Checklist de revisão](docs/checklist.md)

## 🧪 Testes

```bash
npm run lint
npm test          # unitários, API e persistência (SQLite)
npm run test:pg   # persistência + API no PostgreSQL (defina TEST_DATABASE_URL e API_TEST_PG)
npm run build
```

O GitHub Actions roda tudo isso em Linux e Windows, mais a suíte no PostgreSQL e o build das imagens Docker.

## ⚠️ Limitações conhecidas

- **Temperatura da CPU e RPM das ventoinhas no Windows** só aparecem com o [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor) aberto (o Windows não expõe esses sensores sem ele). No Linux vêm do `hwmon`.
- **Uso da GPU**: NVIDIA via `nvidia-smi` (Windows/Linux) e AMD/Intel via `/sys` no Linux. Outras placas mostram nome e VRAM, sem uso.
- **Usuário dono do processo** não é informado no Windows sem privilégios de administrador.
- Dentro de contêineres, o monitor local enxerga o contêiner; prefira o agente nativo.

## 👤 Autor

Repositório mantido por **Milkaarz**, com o painel e o modo agente desenvolvidos por **MizzieWiller**, criado como projeto integrador da **Fatec Itapetininga**, curso de Análise e Desenvolvimento de Sistemas.

Licença: [MIT](LICENSE).
