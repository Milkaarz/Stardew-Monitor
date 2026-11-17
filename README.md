# 🌾 Stardew Monitor

Monitor de hardware e recursos do sistema com visual de fazenda em pixel art. Cada recurso real do computador vira um elemento da fazenda: a **casa** é a CPU, a **plantação** é a RAM, o **celeiro e os silos** são os discos, a **carroça e o correio** são a rede, o **moinho** é a GPU, o **clima** reage à temperatura e à carga, a **estamina** é a bateria e os **dias na fazenda** são o tempo ligado.

Não é só ilustração: todos os números vêm de leituras reais **do computador onde ele está rodando**, guardadas num banco local, com alertas, histórico, conquistas e diário. Roda inteiro no seu computador: **sem login, sem conta e sem servidor na internet**.

> Projeto de fã, inspirado na estética de jogos de fazenda em pixel art. Toda a arte é original, desenhada em código (SVG); nenhum recurso de jogo é usado.

- **🌐 Site:** [tubular-dieffenbachia-164159.netlify.app](https://tubular-dieffenbachia-164159.netlify.app/) — página de entrada: explica como funciona, leva ao download e, se o aplicativo já estiver aberto no seu computador, abre o seu painel.
- **⬇️ Download (Windows):** [StardewMonitor-windows-x64.exe](https://github.com/Milkaarz/Stardew-Monitor/raw/main/release/StardewMonitor-windows-x64.exe) · [pasta `release`](https://github.com/Milkaarz/Stardew-Monitor/tree/main/release)
- **📍 Demo da versão 2 (modo agente + hospedagem PHP):** [mizzie.nyx.dev.br/stardew](https://mizzie.nyx.dev.br/stardew/)

---

## ✨ O que tem

| Área | Funcionalidades |
|---|---|
| 🏡 **Fazenda** | Cena interativa em pixel art; clique em cada construção para ver os detalhes reais. Fumaça da chaminé pela CPU, canteiros pela RAM, grãos nos silos pelos discos, pás do moinho pela GPU, carroça pela rede, vento pelas ventoinhas. |
| ⛅ **Ambiente** | 4 estações (data real nos hemisférios norte/sul ou calendário próprio de 28 dias), ciclo dia/noite pelo horário local, clima reativo (sol, nublado, chuva, tempestade, calor) com limites configuráveis. |
| 🐔 **Animais** | Galinhas felizes/assustadas (saúde geral), vacas descansando (ociosidade), porcos fuçando (E/S de disco), patos no lago (tudo normal). Os números continuam sempre visíveis. |
| 🔔 **Alertas** | Limites individuais (CPU, RAM, disco, temperatura, GPU, bateria, máquina sem sinal), tempo de sustentação, sem repetição, intervalo mínimo, avisos de recuperação. Envio por **Discord**, **Telegram** e **e-mail**. Sons 8 bits opcionais (desligados por padrão). |
| 📈 **Histórico** | Gráficos de CPU, RAM, GPU, temperatura, rede e disco: 15 min, 1 h, 6 h, 24 h, 7 dias e 30 dias, com agregação por minuto/hora e retenção configurável. |
| 🧑‍🌾 **Moradores** | Processos com ordenação, filtros, pesquisa e 10/25/50/100 resultados. **Expulsar morador** (encerrar processo) com confirmação, só a partir do próprio computador, com proteção de processos essenciais e auditoria. |
| 🏘️ **Pelican Town** | Mapa com uma casinha por máquina: verde, amarelo, vermelho ou cinza (sem sinal). Opcional: outras máquinas da sua rede podem enviar dados com o agente. |
| 🏆 **Conquistas** | Persistentes, com progresso e data: Fazendeiro Dedicado, Veterano da Fazenda, Colheita Recorde, Fazenda Organizada, Dia Tranquilo, Máquina Incansável e outras. |
| 🎉 **Festivais** | Festival do Ovo, Dança das Flores, Luau de Verão, Noite dos Espíritos, Festival da Lua Gelada e Festival das Estrelas, com decorações temporárias e datas configuráveis. |
| 📖 **Diário** | Changelog da máquina: categorias, pesquisa, histórico por data e salvamento automático. Mais o **Quadro de Missões** (tarefas, com missões diárias). |
| 🎨 **Temas** | Fazenda Padrão, da Floresta, da Praia, da Colina, de Gengibre e Minas (interface escura). |
| 🔒 **Segurança** | Sem login: o painel só responde no próprio computador (127.0.0.1) e recusa pedidos de outros sites. Validação de tudo que entra, rate limiting, segredos criptografados, auditoria. |

## ⬇️ Baixar e usar (recomendado)

1. Baixe o aplicativo na pasta [**`release`**](https://github.com/Milkaarz/Stardew-Monitor/tree/main/release) do repositório:
   - Windows: [`StardewMonitor-windows-x64.exe`](https://github.com/Milkaarz/Stardew-Monitor/raw/main/release/StardewMonitor-windows-x64.exe) (≈90 MB). Na página do arquivo, clique em **Download raw** (ou no ícone de download).
   - Linux: gere o executável pelo código-fonte (veja "Gerar o aplicativo você mesmo").
2. Abra o arquivo (dois cliques). Não precisa instalar nada, nem Node.js: o arquivo já é o programa e funciona de qualquer pasta.
3. O navegador abre sozinho em **http://localhost:3001** com a fazenda **deste** computador.
4. Para encerrar, feche a janela do aplicativo.

Os dados (histórico, conquistas, diário, configurações) ficam em `%LOCALAPPDATA%\StardewMonitor` no Windows e `~/.local/share/stardew-monitor` no Linux. Abrir o aplicativo de novo, com ele já aberto, só abre o navegador.

> O Windows pode mostrar "O Windows protegeu o computador" na primeira vez, porque o executável não tem assinatura digital paga. Clique em **Mais informações → Executar assim mesmo**. Detalhes em [docs/aplicativo.md](docs/aplicativo.md).

### Gerar o aplicativo você mesmo

```bash
npm install
npm run app:build      # cria release/StardewMonitor-<sistema>-<arquitetura>
```

O executável sai para o sistema de quem roda o comando (no Windows, o `.exe`).

### Atualizar o arquivo para download

O executável disponível para download fica em [`release/`](https://github.com/Milkaarz/Stardew-Monitor/tree/main/release), no próprio repositório. Para publicar uma versão nova:

```bash
npm run app:build
git add -f release/StardewMonitor-windows-x64.exe
git commit -m "Atualiza o aplicativo"
git push
```

O botão de download do site e os links deste README apontam para esse arquivo, então passam a entregar a versão nova assim que o push chegar ao GitHub. (O `-f` é necessário porque a pasta `release/` está no `.gitignore`; o GitHub aceita arquivos de até 100 MB.)

## 🧑‍💻 Rodar pelo código-fonte

Requisitos: **Node.js 22.13+** e npm.

```bash
git clone https://github.com/Milkaarz/Stardew-Monitor.git
cd Stardew-Monitor
npm install
npm run build          # compila a interface
npm start              # http://localhost:3001
```

## 🖥️ Por que tem que rodar no computador?

Um site na internet não consegue ler o hardware de quem o visita, e uma hospedagem (Render, Vercel...) só enxerga o próprio servidor. Por isso o Stardew Monitor é um aplicativo que roda **no computador que você quer monitorar**: ele lê os sensores direto do sistema e mostra o painel no seu navegador, em `localhost`.

### E o site no Netlify?

O site publicado (Netlify) contém só a interface, sem o servidor: ele **não consegue** mostrar os dados de ninguém. Aberto fora do aplicativo, ele vira uma página de entrada com o passo a passo e o botão de download (o arquivo da pasta `release`), e verifica se o aplicativo está aberto no seu computador (`localhost:3001` a `3005`) para oferecer "Abrir meu painel". Num site HTTPS, o navegador pode pedir permissão para acessar a rede local antes dessa verificação.

Para atualizar o site, basta enviar as mudanças ao GitHub (o Netlify publica de novo).

### Outras máquinas

Quer acompanhar outras máquinas da sua casa/rede no mesmo painel? Rode o **agente** nelas (veja [docs/agente.md](docs/agente.md)).

## 📁 Estrutura

```
app/        aplicativo baixável (abre o servidor local e o navegador)
scripts/    geração do executável (build-app.mjs)
backend/    API Express, SSE em tempo real, alertas, conquistas, histórico, proteção local
agent/      agente leve + coletor de métricas multiplataforma (usado também pelo backend)
frontend/   interface Preact + Vite: fazenda em SVG, páginas, gráficos, sons, página de entrada do site
database/   adaptadores SQLite/PostgreSQL e migrations
shared/     regras puras: métricas -> fazenda, estações, festivais, alertas, conquistas, mensagens
tests/      testes unitários, de API e de persistência (node:test)
docs/       documentação
legacy/     versão 2 (painel antigo e modo hospedagem PHP), preservada
```

## 📚 Documentação

- [Aplicativo baixável](docs/aplicativo.md)
- [Instalação e configuração (código-fonte)](docs/instalacao.md)
- [Agente de monitoramento](docs/agente.md)
- [Outras formas de rodar: Docker e PostgreSQL](docs/deploy.md)
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

O GitHub Actions roda tudo isso em Linux e Windows, mais a suíte no PostgreSQL e o build do Docker, e gera os executáveis de Windows e Linux como artefatos de cada execução.

## ⚠️ Limitações conhecidas

- **Temperatura da CPU e RPM das ventoinhas no Windows** só aparecem com o [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor) aberto (o Windows não expõe esses sensores sem ele). No Linux vêm do `hwmon`.
- **Uso da GPU**: NVIDIA via `nvidia-smi` (Windows/Linux) e AMD/Intel via `/sys` no Linux. Outras placas mostram nome e VRAM, sem uso.
- **Usuário dono do processo** não é informado no Windows sem privilégios de administrador.
- Dentro de contêineres, o monitor local enxerga o contêiner; prefira o aplicativo.
- O site (Netlify) não mostra dados: o painel só funciona aberto pelo aplicativo, em `localhost`.
- O aplicativo não tem assinatura digital: o Windows SmartScreen e alguns antivírus podem pedir confirmação na primeira execução.

## 👤 Autor

Repositório mantido por **Milkaarz**, com o painel e o modo agente desenvolvidos por **MizzieWiller**, criado como projeto integrador da **Fatec Itapetininga**, curso de Análise e Desenvolvimento de Sistemas.

Licença: [MIT](LICENSE).
