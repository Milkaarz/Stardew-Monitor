# Checklist de revisão do projeto

Use esta lista antes de publicar alterações ou uma nova versão.

## Documentação

- [ ] O README descreve o comportamento atual.
- [ ] Os requisitos e limitações estão documentados.
- [ ] As instruções de instalação foram conferidas.
- [ ] As variáveis de ambiente estão descritas.
- [ ] As rotas HTTP estão atualizadas.
- [ ] Os diagramas correspondem à implementação.

## Instalação e execução

- [ ] Node.js 18 ou superior está instalado.
- [ ] `npm install` é executado sem erros.
- [ ] `npm start` inicia o servidor.
- [ ] A página inicial abre em `/`.
- [ ] A rota `/health` responde `ok`.

## Funcionalidades

- [ ] CPU e RAM são exibidas quando disponíveis.
- [ ] Os volumes de armazenamento são apresentados.
- [ ] A lista de processos é carregada.
- [ ] Informações de rede são apresentadas quando disponíveis.
- [ ] O histórico recebe amostras durante a execução.
- [ ] É possível adicionar tarefas.
- [ ] É possível concluir e reabrir tarefas.
- [ ] É possível excluir tarefas.
- [ ] Tarefas diárias têm seu estado reiniciado na mudança de data.

## Qualidade e segurança

- [ ] Não há credenciais ou tokens no repositório.
- [ ] Arquivos locais e temporários foram removidos do commit.
- [ ] Entradas do usuário são tratadas com segurança.
- [ ] O diretório de dados possui permissões adequadas.
- [ ] A exposição pública das métricas foi avaliada.
- [ ] A interface foi conferida em telas menores.
- [ ] Erros e limitações conhecidos foram documentados.

## Publicação

- [ ] A branch e os commits possuem nomes descritivos.
- [ ] A Pull Request explica as alterações.
- [ ] As verificações foram executadas.
- [ ] A configuração de hospedagem foi revisada.
- [ ] A persistência de dados foi verificada no ambiente de produção.
