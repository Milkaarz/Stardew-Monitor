# Política de segurança

## Versões contempladas

A análise de relatos de segurança é direcionada à versão atualmente disponível na branch `main`. Como o projeto não publica uma matriz formal de versões suportadas, não há garantia de correções para versões antigas ou forks.

## Como comunicar uma vulnerabilidade

Se você identificar uma possível vulnerabilidade, evite publicar detalhes técnicos, provas de conceito exploráveis ou dados sensíveis em uma Issue pública.

Utilize um canal privado de contato disponibilizado no perfil da pessoa mantenedora do repositório. Inclua, quando possível:

- Descrição clara do problema.
- Componente ou arquivo afetado.
- Condições necessárias para reproduzir o comportamento.
- Impacto potencial.
- Sugestão de mitigação, se houver.

Aguarde uma resposta antes de divulgar publicamente detalhes que possam colocar outras pessoas em risco.

## Boas práticas para quem executa o projeto

- Mantenha Node.js e dependências atualizados.
- Não publique arquivos `.env`, tokens, senhas ou chaves privadas.
- Restrinja o acesso à instância quando ela apresentar informações do sistema.
- Avalie cuidadosamente a exposição pública das rotas de gerenciamento de tarefas.
- Utilize HTTPS quando disponibilizar a aplicação pela internet.
- Evite executar o servidor com privilégios administrativos sem necessidade.
- Revise as permissões do diretório utilizado para armazenar `tarefas.json`.

## Escopo das informações exibidas

O servidor utiliza a biblioteca `systeminformation` para consultar dados do ambiente em que o processo Node.js está executando. Entre as informações exibidas podem estar uso de CPU e memória, volumes de armazenamento, processos, interfaces de rede, hostname e versão do sistema.

Antes de disponibilizar uma instância publicamente, avalie se essas informações podem revelar detalhes que você não deseja compartilhar.

## Limitações

Este documento descreve orientações gerais para o projeto e não representa uma auditoria de segurança nem uma garantia de ausência de vulnerabilidades.
