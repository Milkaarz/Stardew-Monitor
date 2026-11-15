# Processo de desenvolvimento e implantação

## 1. Ambiente

- Node.js 18 ou superior.
- npm.
- Git.
- Editor de código de preferência.

## 2. Preparação

```bash
git clone https://github.com/Milkaarz/Stardew-Monitor.git
cd Stardew-Monitor
npm install
```

## 3. Execução local

```bash
npm start
```

A aplicação utiliza a porta `3000` por padrão. A variável `PORT` permite selecionar outra porta.

## 4. Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor HTTP |
| `TZ_NAME` | Fuso horário usado na formatação de data e hora |
| `DATA_DIR` | Diretório de armazenamento do arquivo de tarefas |

Exemplo:

```bash
PORT=3000 TZ_NAME=America/Sao_Paulo npm start
```

No PowerShell:

```powershell
$env:PORT = "3000"
$env:TZ_NAME = "America/Sao_Paulo"
npm start
```

## 5. Fluxo Git sugerido

1. Atualizar a branch principal.
2. Criar uma branch para a tarefa.
3. Implementar a alteração.
4. Executar testes manuais e verificações pertinentes.
5. Revisar o diff.
6. Abrir Pull Request.
7. Integrar a alteração após revisão.

Exemplo:

```bash
git switch main
git pull
git switch -c feat/nova-funcionalidade
```

## 6. Verificações antes da publicação

- Confirmar que `npm install` termina sem erros.
- Confirmar que `npm start` inicia o servidor.
- Acessar `/` e verificar a renderização do painel.
- Acessar `/health` e confirmar a resposta `ok`.
- Testar o fluxo de adicionar, concluir e excluir tarefas.
- Conferir a persistência de `tarefas.json`.
- Verificar a configuração de `PORT`, `TZ_NAME` e `DATA_DIR`.

## 7. Implantação

O projeto pode ser executado em um ambiente que ofereça Node.js 18 ou superior. Configure o comando de instalação como `npm install` e o comando de inicialização como `npm start`.

A plataforma de hospedagem deve permitir que o processo Node.js consulte as informações do ambiente e tenha permissão de escrita no diretório configurado para os dados das tarefas.

**Atenção:** em hospedagens com sistema de arquivos temporário, o arquivo `tarefas.json` pode não sobreviver a reinicializações ou novas implantações. Para persistência durável, utilize um volume persistente ou adapte o projeto para um banco de dados.

## 8. Logs e diagnóstico

O servidor registra no console a inicialização e erros ocorridos durante a coleta. A rota `/health` pode ser utilizada por verificações externas para confirmar que o processo responde.
