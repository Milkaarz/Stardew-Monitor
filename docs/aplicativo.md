# Aplicativo baixável

O jeito mais simples de usar o Stardew Monitor: um único arquivo executável que já traz o Node.js, o servidor, o coletor de métricas e a interface. Não precisa instalar nada.

| Sistema | Arquivo |
|---|---|
| Windows 10/11 (64 bits) | `StardewMonitor-windows-x64.exe` |
| Linux (64 bits) | `StardewMonitor-linux-x64` |

## Usando

1. Baixe o arquivo da página **Releases** do repositório.
2. Abra (dois cliques). No Linux: `chmod +x StardewMonitor-linux-x64 && ./StardewMonitor-linux-x64`.
3. Uma janela de console mostra o endereço do painel, e o navegador abre em `http://localhost:3001`.
4. Para encerrar, feche a janela (ou Ctrl+C).

O aplicativo:

- coleta as métricas **do computador em que está rodando** (CPU, RAM, discos, rede, GPU, temperaturas quando disponíveis, bateria, processos);
- escuta só em `127.0.0.1`: outros computadores da rede não conseguem abrir o painel;
- se já estiver aberto, abrir de novo só abre o navegador (não cria uma segunda cópia);
- se a porta 3001 estiver ocupada por outro programa, usa a próxima livre (3002, 3003...).

### Onde ficam os dados

| Sistema | Pasta |
|---|---|
| Windows | `%LOCALAPPDATA%\StardewMonitor` (ex.: `C:\Users\Você\AppData\Local\StardewMonitor`) |
| Linux | `~/.local/share/stardew-monitor` |
| macOS (gerado localmente) | `~/Library/Application Support/StardewMonitor` |

Ali ficam o banco (`stardew.db`: histórico, conquistas, diário, configurações) e o segredo que criptografa credenciais de notificação (`.app-secret`). Para começar do zero, feche o aplicativo e apague a pasta.

### Opções de linha de comando

| Opção | Efeito |
|---|---|
| `--no-browser` | Não abre o navegador |
| `--port 3005` | Porta inicial (padrão 3001) |
| `--data C:\outra\pasta` | Pasta de dados diferente |

Variáveis de ambiente do [.env.example](../.env.example) também funcionam (por exemplo `DISCORD_WEBHOOK_URL`, `LOCAL_INTERVAL`).

### Iniciar junto com o Windows

Pressione `Win + R`, digite `shell:startup` e coloque ali um atalho para o `.exe` (com `--no-browser` no campo "Destino", se não quiser que o navegador abra sozinho).

### Aviso do Windows SmartScreen / antivírus

O executável não tem assinatura digital paga, então na primeira execução o Windows pode mostrar "O Windows protegeu o computador". Clique em **Mais informações → Executar assim mesmo**. O arquivo é gerado pelo GitHub Actions a partir deste código-fonte; você também pode gerá-lo você mesmo (abaixo).

### Temperatura e ventoinhas no Windows

O Windows não expõe esses sensores sem ajuda: deixe o [LibreHardwareMonitor](https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases) aberto e o Stardew Monitor passa a mostrá-los em até 1 minuto.

## Gerando o executável

Requisitos: Node.js 22.13+ (recomendado 24). O executável é gerado para o sistema e a arquitetura de quem roda o comando.

```bash
npm install
npm run app:build
```

Etapas do `scripts/build-app.mjs`:

1. compila a interface (Vite);
2. junta servidor, coletor e banco num único arquivo (`esbuild`);
3. embute esse arquivo e a interface numa cópia do próprio Node.js ([Single Executable Applications](https://nodejs.org/api/single-executable-applications.html), com `postject`);
4. grava `release/StardewMonitor-<sistema>-<arquitetura>`.

O aviso `The signature seems corrupted!` durante a etapa 3 é esperado: o `node.exe` original é assinado e a injeção invalida essa assinatura.

Para testar o código do aplicativo sem gerar o executável: `npm run build && npm run app`.

### Publicando uma versão

Ao criar uma tag `v*` (ex.: `git tag v3.1.0 && git push --tags`), o GitHub Actions gera os executáveis de Windows e Linux, testa se cada um sobe e responde, e cria a Release com os arquivos anexados.
