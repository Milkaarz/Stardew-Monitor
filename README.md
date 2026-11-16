# 🌾 Stardew Monitor

> 📌 **Nota sobre as versões**
>
> Este projeto nasceu como o dashboard de Sistemas Operacionais (SO), que mostra as métricas de uma máquina (CPU, RAM, disco, rede, Git e arquivos). Nesta versão, o painel ganhou o **tema Stardew Valley** e passou a monitorar também o **seu próprio computador**. O que mudou:
>
> - o HTML, que ficava dentro do `index.js`, foi separado em `public/index.html`, e o servidor passou a entregar os dados em `/api/dados`;
> - visual de pixel art: a fazenda vira o PC, a energia vira a CPU, a mochila vira a RAM e o silo vira o disco;
> - novo **modo agente**: o `agente-stardew.js` roda no seu PC e envia as métricas para uma hospedagem PHP (`site/`), que mostra o último dado recebido;
> - painel mais completo: núcleos da CPU, vários discos, swap, rede em tempo real, processos ("Moradores de Pelican Town") e histórico de CPU e RAM;
> - **Quadro de Missões** (lista de tarefas) e música e efeitos sonoros gerados no navegador;
> - `.env`, `ecosystem.stardew.config.js` (PM2) e este README completo para quem quiser copiar e testar.

**📍 Demo**

- **Modo agente** (hospedagem PHP, mostra as métricas de um PC): [https://mizzie.nyx.dev.br/stardew/](https://mizzie.nyx.dev.br/stardew/)

Aplicação **Node.js + Express** que monitora as métricas de uma máquina com o visual de uma fazenda de Stardew Valley. O painel mostra o estado do computador como se fossem os recursos da fazenda: se a RAM e a CPU apertam, a fazenda está em perigo.

---

## 📑 Sumário

- [Dois modos de uso](#-dois-modos-de-uso)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Pré-requisitos](#-pré-requisitos)
- [Início rápido (modo local)](#-início-rápido-modo-local)
- [Quadro de Missões](#-quadro-de-missões)
- [Som e música](#-som-e-música)
- [Rodar em segundo plano e ao ligar o PC](#-rodar-em-segundo-plano-e-ao-ligar-o-pc)
- [Modo agente: mostrar o seu PC num site](#-modo-agente-mostrar-o-seu-pc-num-site)
- [Rotas / API](#-rotas--api)
- [Como as métricas são coletadas](#-como-as-métricas-são-coletadas)
- [Banco de dados](#️-banco-de-dados)
- [Testes](#-testes)
- [Segurança e privacidade](#-segurança-e-privacidade)
- [Limitações conhecidas](#️-limitações-conhecidas)
- [Solução de problemas](#-solução-de-problemas)
- [Autor](#-autor)

---

## 🔀 Dois modos de uso

O projeto funciona de duas formas. Você pode usar só uma ou as duas ao mesmo tempo.

|                              | **Modo local**                                        | **Modo agente (site)**                                           |
| ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Quem lê as métricas          | `index.js`, amostrando a cada 10 segundos             | `agente-stardew.js`, no seu PC, que envia os dados para o site   |
| Onde a página roda           | `http://localhost:3001` (ou a porta que você definir) | Qualquer hospedagem com **PHP** (nada de Node no servidor)       |
| Atualização da página        | A cada 10 segundos                                    | Consulta o `dados.json` a cada 60 s; o PC envia a cada 5 minutos (configurável) |
| Métricas de qual máquina     | A que está rodando o `index.js`                       | O PC onde o `agente-stardew.js` está rodando                     |
| Se o PC desligar             | A página sai do ar                                    | A página continua no ar, com o último dado e o aviso "sem sinal" |

```
Modo local:   navegador  ──►  index.js (seu PC)  ──►  lê RAM, CPU, disco, rede, processos

Modo agente:  agente-stardew.js (seu PC) ──POST──►  receber.php ──►  dados.json
                    │                                                   ▲
                    └─ pede dados completos ao index.js (opcional)      │
                                         navegador  ──►  index.html  ───┘
```

O `index.html` é **o mesmo arquivo** nos dois modos (`public/index.html` e `site/index.html`). Ele detecta sozinho onde está: em `localhost`, em IP de rede local (`192.168.x.x`, `10.x.x.x`), em qualquer endereço com porta ou aberto como arquivo (`file://`), ele busca `/api/dados`; em um domínio de internet, ele busca `dados.json`.

## ✨ Funcionalidades

O painel tem dez abas (também acessíveis por `#tudo`, `#fazenda`, `#missoes`, `#moradores`, `#diario`, `#cpu`, `#ram`, `#disco`, `#rede` e `#historico`):

| Aba            | O que mostra                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **📋 Tudo**     | Todos os cartões juntos na mesma página                                                                      |
| **🌾 Fazenda**  | Barras de **Energia** (CPU livre), **Mochila** (RAM) e **Silo** (disco principal), e a mensagem de estado     |
| **📜 Missões**  | Quadro de Missões: lista de tarefas com tarefas diárias                                                       |
| **🏘️ Moradores** | Os 8 processos que mais usam CPU, com PID, usuário, CPU e memória                                            |
| **📖 Diário**   | Últimas mensagens do log do servidor                                                                          |
| **⚡ CPU**      | Modelo, núcleos físicos/lógicos, velocidade, temperatura (se disponível), carga média e uso por núcleo        |
| **🎒 RAM**      | RAM total/em uso/disponível, swap (Linux) e memória usada pelo Node (RSS)                                     |
| **🏚️ Disco**    | Todos os discos (no Windows, todas as letras de unidade), com usado, livre e total                            |
| **🛣️ Rede**     | Interface, download e upload agora, total recebido/enviado, hostname, IP, sistema operacional, Node e porta   |
| **📈 Histórico** | Tempo online, visitas ao site e gráficos de barras de CPU e RAM (últimas 40 leituras)                        |

Recursos adicionais:

- **Estado da fazenda** calculado pelo uso: as barras ficam verdes até 70%, amarelas a partir de 70% (aviso) e vermelhas a partir de 90% (alerta). A mensagem muda entre "A fazenda vai bem", "Cuidado!" e "Perigo!".
- **Data no estilo do jogo** (estação e dia, calculados a partir da data e da hora reais) e nome da fazenda (o hostname da máquina) no título da aba do navegador.
- **Faixa de status** no rodapé da tela com o horário do último dado. No modo agente, vira "PC sem sinal" quando o PC para de enviar; no modo local, avisa quando o painel não responde.
- **Modo demonstração:** abrindo o `index.html` direto como arquivo (`file://`), o painel mostra dados de exemplo, só para ver o visual.
- **Cenário em pixel art** com fazenda, casa, espantalho, plantações, galinhas, nuvens e brilho do sol.
- **Música e efeitos sonoros** gerados no navegador, com botões fixos de **Som** e **Música**.
- **Senha opcional** para o painel local (`PAINEL_SENHA`).

## 🧰 Tecnologias

- [Node.js](https://nodejs.org/) e [Express](https://expressjs.com/) `^5.2.1`
- Módulos nativos do Node: `os`, `fs`, `path` e `child_process`
- PHP simples (só no modo agente, no servidor de hospedagem)
- [PM2](https://pm2.keymetrics.io/) (opcional, para rodar em segundo plano)
- HTML, CSS e JavaScript puros no navegador (gráficos em SVG, sem bibliotecas)
- Google Fonts (Press Start 2P e VT323), via CDN
- Web Audio API (sons e música gerados no navegador)

> O `package.json` também lista o pacote `cors`, mas o código atual não o utiliza.

## 📁 Estrutura do repositório

```
Stardew-Monitor/
├── index.js                    # Servidor Express: lê as métricas e entrega /api/dados
├── agente-stardew.js           # Agente: lê as métricas do PC e envia para o site (modo agente)
├── public/
│   └── index.html              # Página do painel (modo local)
├── site/                       # Arquivos para subir na hospedagem PHP (modo agente)
│   ├── index.html              # Página do painel (lê dados.json)
│   └── receber.php             # Recebe os dados do agente e salva em dados.json
├── ecosystem.stardew.config.js # PM2: sobe painel e agente juntos
├── .env.example                # Modelo de configuração do agente (copie para .env)
├── .gitignore
├── package.json
└── README.md
```

> ℹ️ `public/index.html` e `site/index.html` têm o **mesmo conteúdo**. Se você editar um, copie a alteração para o outro.

## 📋 Pré-requisitos

| Ferramenta                     | Versão                                  | Por quê                                                                             |
| ------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org/) | **18.15 ou superior** (20.6+ no agente) | Express 5 exige Node 18+; o disco usa `fs.statfsSync`; o agente usa `--env-file`     |
| npm                            | Vem com o Node                          | Instalar as dependências                                                            |
| [Git](https://git-scm.com/)    | Qualquer versão recente                 | Clonar o projeto e mostrar branch/commit nos dados (opcional)                       |
| Hospedagem com PHP             | PHP 7 ou superior                       | Só para o modo agente                                                               |

Funciona em **Windows, Linux e macOS**. É preciso internet no navegador para carregar as fontes (sem elas, o painel usa a fonte padrão).

## 🚀 Início rápido (modo local)

```bash
# 1. Clone o repositório
git clone https://github.com/Milkaarz/Stardew-Monitor.git

# 2. Entre na pasta
cd Stardew-Monitor

# 3. Instale as dependências
npm install

# 4. Inicie
npm start
```

O terminal mostra `painel pronto na porta 3001`. Abra no navegador:

```
http://localhost:3001
```

> ⚠️ Digite o **`http://`**. Se o navegador completar com `https://`, aparece `ERR_SSL_PROTOCOL_ERROR`, porque o servidor local não tem certificado.

Variáveis opcionais do painel local (defina no terminal antes de iniciar):

| Variável       | Padrão | Descrição                                                    |
| -------------- | ------ | ------------------------------------------------------------ |
| `PORT`         | `3001` | Porta do servidor                                            |
| `PAINEL_SENHA` | vazio  | Se definida, o navegador pede senha (usuário: qualquer um)   |

```bash
# Linux / macOS
PORT=3003 PAINEL_SENHA=minhasenha node index.js

# Windows (PowerShell)
$env:PORT=3003; $env:PAINEL_SENHA="minhasenha"; node index.js
```

## 📜 Quadro de Missões

Na aba **Missões** você mantém uma lista de tarefas no estilo do jogo:

- Digite a tarefa (até 80 caracteres), marque **diária** se quiser e clique em **Adicionar**.
- Clique em ☐ para concluir a tarefa (vira ☑) e em ✕ para apagá-la.
- O topo do quadro mostra quantas missões foram concluídas (`2/5 concluídas`).

> ℹ️ As missões ficam salvas no **`localStorage` do seu navegador**, e não no servidor. Elas não aparecem em outro navegador ou computador e não vão para o site do modo agente. Na hospedagem, o painel é só de visualização.

## 🎵 Som e música

- O botão **🔊 Som** liga e desliga os efeitos (a preferência fica no `localStorage`). Há sons ao trocar de aba e ao concluir ações.
- O botão **🎵 Música** toca uma melodia curta em loop, gerada no navegador com a Web Audio API, sem nenhum arquivo de áudio.
- O navegador só libera o áudio depois de um clique ou de uma tecla pressionada na página.

## 🔁 Rodar em segundo plano e ao ligar o PC

Com o [PM2](https://pm2.keymetrics.io/), o painel continua rodando mesmo com o terminal fechado.

```bash
npm install -g pm2

pm2 start ecosystem.stardew.config.js    # sobe o painel e o agente (ou: npm run pm2)
pm2 save                                 # guarda a lista para religar depois
pm2 list                                 # confere o que está rodando
pm2 logs agente-stardew --lines 20       # logs do agente
pm2 restart painel-stardew               # reinicia depois de editar o index.js
pm2 stop all                             # para tudo
```

Os processos se chamam `painel-stardew` e `agente-stardew`. Para subir só um dos dois: `pm2 start ecosystem.stardew.config.js --only painel-stardew` ou `--only agente-stardew`. Se você usa só o painel local, ignore o agente (ele não inicia sem o `.env`).

**Iniciar junto com o computador**

- **Linux / macOS:** rode `pm2 startup`, copie e execute o comando que ele mostrar, e depois `pm2 save`.
- **Windows (sem precisar de administrador):** crie um arquivo `iniciar-painel.bat` com o conteúdo abaixo e coloque na pasta que abre com `Win + R` → `shell:startup`.

```bat
@echo off
rem Só inclua a linha do PATH se o Node não estiver no PATH do Windows
set "PATH=%PATH%;C:\caminho\para\a\pasta\do\node"
cd /d "C:\caminho\para\Stardew-Monitor"
timeout /t 20 /nobreak >nul
call pm2 resurrect
```

O `pm2 resurrect` só religa o que foi salvo com `pm2 save`. Sempre que mudar a lista de processos, rode `pm2 save` de novo.

## 🌐 Modo agente: mostrar o seu PC num site

Uma página hospedada na internet não consegue ler a RAM do seu computador. Por isso um pequeno programa, o **agente**, roda no seu PC, junta os dados e os envia para o site, que só mostra o último que chegou.

**1. Escolha uma senha (token)** e coloque-a na linha `$TOKEN` do arquivo `site/receber.php`. Não use a senha de exemplo e **não faça commit da sua senha real** (veja [Segurança](#-segurança-e-privacidade)).

**2. Suba os arquivos da pasta `site/`** para a hospedagem (por exemplo, para `public_html` ou para uma subpasta como `stardew/`):

- `index.html`
- `receber.php`

Não suba o `agente-stardew.js`, o `index.js`, o `.env`, o `.git` nem o `node_modules`. O `dados.json` é criado sozinho no primeiro envio, e a pasta precisa aceitar escrita (o padrão das hospedagens costuma aceitar).

**3. Confira o `receber.php` no navegador.** Abra `https://seudominio.com/receber.php`. Tem que aparecer `{"erro":"metodo"}`. Se der 404, o arquivo não está nesse endereço.

**4. Configure o agente no PC.** Copie `.env.example` para `.env` e preencha:

```
PAINEL_URL=https://seudominio.com/receber.php
PAINEL_TOKEN=a-mesma-senha-do-receber-php
PAINEL_INTERVALO=5
```

Se o site está numa subpasta, inclua ela na URL (`https://seudominio.com/stardew/receber.php`).

Variáveis opcionais do agente (também no `.env`):

| Variável        | Padrão                  | Descrição                                                                     |
| --------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `PAINEL_LOCAL`  | `http://localhost:3000` | Endereço do painel local, de onde o agente busca os dados completos           |
| `PAINEL_SENHA`  | vazio                   | Senha do painel local, se você definiu uma                                    |
| `PORT`          | `3000`                  | Porta usada para montar o `PAINEL_LOCAL` quando ele não é informado           |

> ⚠️ O painel local usa a porta **3001** por padrão, mas o agente procura o painel na **3000**. Se você não mudou nada, defina `PAINEL_LOCAL=http://localhost:3001` no `.env` (ou inicie o painel com `PORT=3000`). Sem isso, o agente envia só os dados básicos.

**5. Rode o agente:**

```bash
npm run agente
```

Tem que aparecer `agente iniciado` e `dados enviados`. O agente só escreve `dados enviados` quando o `receber.php` confirmou que salvou. Se o painel local (`index.js`) estiver rodando no mesmo PC, o agente junta os dados dele com os seus e envia o pacote completo (núcleos, discos, processos, rede). Se o painel estiver desligado, aparece `painel local não respondeu · enviando só os dados básicos` e o site mostra o essencial (CPU, RAM e disco principal).

**6. Abra o site.** Em `https://seudominio.com` aparece o painel com os dados do seu PC e a faixa no rodapé com o horário do último dado. Para deixar o agente rodando sem terminal, use o PM2 (seção acima).

Se o PC parar de enviar por mais de 3 intervalos (15 minutos, no padrão), o painel mostra **"PC sem sinal"** e continua exibindo o último dado recebido.

## 🔌 Rotas / API

**Servidor local (`index.js`)**

| Método | Rota         | Descrição                                      | Resposta           |
| ------ | ------------ | ---------------------------------------------- | ------------------ |
| `GET`  | `/`          | Página do painel (`public/index.html`)         | `text/html`        |
| `GET`  | `/api/dados` | Métricas atuais da máquina (JSON)              | `application/json` |

A página busca `/api/dados` a cada 10 segundos e atualiza o conteúdo sem recarregar. As visitas contam só os acessos a `/`, não as atualizações automáticas.

**Hospedagem PHP (modo agente)**

| Método | Rota          | Descrição                                                              |
| ------ | ------------- | ---------------------------------------------------------------------- |
| `POST` | `receber.php` | Recebe o JSON do agente (cabeçalho `X-Token`) e grava em `dados.json`  |
| `GET`  | `dados.json`  | Último dado recebido, com o horário de chegada (`recebidoEm`)          |

Respostas do `receber.php`: `{"ok":true}` em caso de sucesso; `405` (`metodo`) se não for `POST`; `403` (`token`) se a senha estiver errada; `400` (`json`) se o corpo não for um JSON válido.

```bash
curl http://localhost:3001/api/dados
```

## 📊 Como as métricas são coletadas

| Métrica                        | Origem                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| RAM total / livre / %          | `os.totalmem()` e `os.freemem()`                                                                                 |
| CPU (%) e núcleos              | Comparação de duas leituras de `os.cpus()` a cada 10 s (uso real, por núcleo e média). O agente mede com 1 s de intervalo |
| Modelo, vCPUs, velocidade      | `os.cpus()` e `os.arch()`                                                                                        |
| Carga média                    | `os.loadavg()` (no Windows aparece zerada)                                                                       |
| Disco                          | `fs.statfsSync` em todas as letras A a Z (Windows) ou na raiz `/` (Linux/macOS). O disco do projeto vira o **Silo** |
| Swap                           | `/proc/meminfo` (só no Linux)                                                                                    |
| Rede (download/upload agora)   | `netstat -e` (Windows) ou `/proc/net/dev` (Linux), pela diferença entre duas leituras                            |
| Processos ("Moradores")        | `Get-Process` pelo PowerShell (Windows) ou `ps` (Linux/macOS): os 8 que mais usam CPU                            |
| Git (branch, commit, mensagem) | `git` chamado sem shell, com cache de 1 minuto (não abre janela de terminal no Windows)                          |
| IP                             | Primeira interface IPv4 não interna de `os.networkInterfaces()`                                                  |
| Tempo online                   | `process.uptime()` (modo local) ou `os.uptime()` (agente: tempo de PC ligado)                                    |
| Histórico de CPU e RAM         | Últimas 40 amostras (a cada 10 s no painel local; a cada envio no agente, até 25 de RAM)                         |

## 🗄️ Banco de dados

**Não se aplica.** No servidor local, o contador de visitas, os históricos e o log ficam **em memória** e zeram quando o processo reinicia. No modo agente, o único "armazenamento" é o arquivo `dados.json`, que guarda só o último envio. As missões ficam no `localStorage` do navegador.

## 🧪 Testes

Ainda não há testes automatizados. A verificação é manual:

1. `npm start` e confirmar `painel pronto na porta 3001`.
2. Abrir `http://localhost:3001` e navegar pelas dez abas.
3. Aguardar 10 segundos e ver os valores e os gráficos atualizarem sem recarregar.
4. Comparar RAM, CPU e disco com o Gerenciador de Tarefas (ou `htop`).
5. Abrir `http://localhost:3001/api/dados` e ver o JSON.
6. Adicionar, concluir e apagar uma missão; recarregar a página e conferir que ela continua lá.
7. Testar os botões **Som** e **Música**.
8. Modo agente: `npm run agente`, ver `dados enviados`, abrir `dados.json` no site e conferir que o horário mudou.
9. Pare o agente e espere 15 minutos: o site deve mostrar "PC sem sinal".
10. Abrir `public/index.html` direto no navegador (`file://`) e ver o modo demonstração.

## 🔒 Segurança e privacidade

- **`dados.json` é público.** No modo agente ele mostra o nome do PC, o IP da rede local, o modelo do processador, os processos em execução, a lista de arquivos da pasta do projeto e a mensagem do último commit. Se isso incomoda, proteja a pasta do site com senha no painel da hospedagem ou remova esses campos do agente.
- **O token é a única proteção do `receber.php`.** Troque a senha de exemplo por uma senha sua nos dois lugares (`site/receber.php` e `.env`). Quem tem o token consegue enviar dados falsos para o seu painel.
- **Não deixe a senha real no GitHub.** O `receber.php` do repositório é versionado, então use uma senha de exemplo no commit e coloque a real só no arquivo que vai para a hospedagem. Se a senha real já foi para o histórico do Git, troque-a.
- **Nunca suba o `.env`.** Ele já está no `.gitignore`. Se vazar, troque a senha no `receber.php` e no `.env`.
- **Não suba para a hospedagem** o `.git`, o `node_modules`, o `index.js`, o `agente-stardew.js` nem o `.env`.
- Em hospedagem pública, use HTTPS. O agente avisa se o endereço foi redirecionado.
- No painel local, use `PAINEL_SENHA` se for expor a porta fora da sua rede.

## ⚠️ Limitações conhecidas

- **Modo agente tem atraso:** o dado tem até 5 minutos (ou o intervalo que você escolher).
- **Sem o painel local, o site mostra menos:** o agente sozinho envia só CPU, RAM, disco principal, Git e arquivos; núcleos, outros discos, processos e rede dependem do `index.js` rodando no mesmo PC.
- **Histórico em memória:** o do painel local zera ao reiniciar. O do agente zera ao reiniciar o agente.
- **Temperatura, carga média e swap:** a temperatura não é coletada (aparece "indisponível"), a carga média é zerada no Windows e o swap só aparece no Linux.
- **Missões só no navegador:** não sincronizam entre dispositivos e não aparecem no site hospedado.
- **Dois `index.html` iguais:** é preciso copiar as edições de `public/` para `site/`.
- **Dependência sem uso:** o `cors` está no `package.json`, mas não é utilizado.

## 🩹 Solução de problemas

| Problema                                           | Causa provável                                                  | Solução                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `ERR_SSL_PROTOCOL_ERROR` em `localhost`            | Navegador abriu `https://`                                      | Digite `http://localhost:3001`                                                          |
| `Cannot find module 'express'`                     | Dependências não instaladas                                     | Rode `npm install`                                                                      |
| `EADDRINUSE`                                       | Porta em uso (ou o PM2 já está rodando o painel)                | Use outra porta (`PORT=...`), ou `pm2 restart painel-stardew`                           |
| `node` ou `pm2` "não reconhecido"                  | Node/PM2 fora do PATH (comum com Node portátil, sem admin)      | Adicione a pasta do Node e `%APPDATA%\npm` ao PATH do usuário, ou use `NODE_BIN`        |
| `Script already launched` no PM2                   | O arquivo já está registrado                                    | Use `pm2 restart <nome>`; veja os nomes em `pm2 list`                                   |
| Agente: "Configuração incompleta"                  | Falta o `.env`                                                  | `cp .env.example .env` e preencha `PAINEL_URL` e `PAINEL_TOKEN`                         |
| Agente: `falha no envio: o site respondeu 403`     | Token diferente entre `.env` e `receber.php`                    | Deixe as duas senhas iguais                                                             |
| Agente: `o site respondeu 404`                     | `PAINEL_URL` errada (ou falta a subpasta)                       | Confira a URL; abrir `receber.php` no navegador deve mostrar `{"erro":"metodo"}`        |
| Agente: "não veio do receber.php"                  | A URL responde, mas não é o `receber.php`                       | Confira a `PAINEL_URL`                                                                  |
| Agente: "redirecionado para ..."                   | O site redireciona (http → https, ou com/sem `www`)             | Use na `PAINEL_URL` o endereço final que ele mostrar                                    |
| Agente: "painel local não respondeu"               | O `index.js` está desligado, ou em outra porta                  | Inicie o painel e confira `PAINEL_LOCAL` / `PORT` (padrão do painel: 3001)              |
| Site mostra "Aguardando o primeiro envio"          | O agente ainda não enviou nada                                  | Rode `npm run agente` e veja se aparece `dados enviados`                                |
| Site mostra "PC sem sinal"                         | O agente parou, ou o PC está desligado                          | `pm2 list` e `pm2 logs agente-stardew`; veja se aparece `dados enviados`                |
| Site mostra os dados do exemplo                    | A página foi aberta como arquivo (`file://`)                    | Abra pelo endereço `http://localhost:3001` ou pelo site                                 |
| Branch/commit aparecem como `N/A`                  | Pasta sem repositório Git ou Git não instalado                  | Rode dentro do clone e instale o Git                                                    |
| Sem som ao abrir a página                          | O navegador bloqueia áudio antes de uma interação               | Clique em qualquer lugar ou em **Música**                                               |
| Repositório pesado                                 | `node_modules/` está no Git                                     | Veja abaixo                                                                             |

**Tirar `node_modules/` do Git** (quem clonar roda `npm install`):

```bash
git rm -r --cached node_modules
git add .gitignore
git commit -m "Remove node_modules do versionamento"
git push
```

## 👤 Autor

Repositório mantido por **Milkaarz**, com o painel e o modo agente desenvolvidos por **MizzieWiller** criado como projeto integrador da **Fatec Itapetininga**, curso de Análise e Desenvolvimento de Sistemas.
