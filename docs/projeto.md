# Documentação do projeto

## 1. Identificação

**Nome:** Stardew Monitor  
**Categoria:** aplicação web de monitoramento de recursos do sistema  
**Repositório:** https://github.com/Milkaarz/Stardew-Monitor

## 2. Objetivo

Apresentar informações técnicas do ambiente em que o servidor está executando por meio de um painel web com identidade visual inspirada em Stardew Valley. A interface representa métricas e recursos do computador com elementos temáticos, tornando a leitura mais intuitiva.

## 3. Escopo funcional

O projeto contempla:

- Consulta da utilização de CPU.
- Consulta de memória RAM e swap, quando disponível.
- Consulta de volumes de armazenamento.
- Consulta de informações de rede.
- Exibição de processos com maior consumo.
- Apresentação de informações gerais do sistema.
- Histórico temporário de CPU e RAM.
- Registro de mensagens de alteração de estado.
- Cadastro, conclusão e remoção de tarefas.
- Identificação de tarefas diárias.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF01 | O sistema deve apresentar a utilização total da CPU. |
| RF02 | O sistema deve apresentar o uso de memória RAM. |
| RF03 | O sistema deve apresentar informações dos volumes de armazenamento encontrados. |
| RF04 | O sistema deve listar processos ordenados pelo consumo de CPU e memória. |
| RF05 | O sistema deve apresentar informações de rede quando disponíveis. |
| RF06 | O sistema deve apresentar informações do processador e do sistema operacional. |
| RF07 | O sistema deve manter amostras temporárias de CPU e RAM durante a execução. |
| RF08 | O sistema deve permitir adicionar tarefas. |
| RF09 | O sistema deve permitir marcar e desmarcar tarefas como concluídas. |
| RF10 | O sistema deve permitir excluir tarefas. |
| RF11 | O sistema deve reiniciar o estado de conclusão das tarefas identificadas como diárias quando mudar a data. |
| RF12 | O sistema deve disponibilizar uma rota simples para verificação de saúde. |

## 5. Requisitos não funcionais

- **RNF01 — Compatibilidade:** executar em Node.js 18 ou superior.
- **RNF02 — Interface:** apresentar layout adaptável a diferentes tamanhos de tela.
- **RNF03 — Usabilidade:** organizar métricas em seções temáticas.
- **RNF04 — Manutenibilidade:** manter a configuração de dependências no `package.json`.
- **RNF05 — Segurança:** não armazenar credenciais diretamente no código.
- **RNF06 — Desempenho:** realizar as consultas de métricas em paralelo quando possível.

## 6. Público-alvo

Pessoas interessadas em visualizar métricas básicas do sistema por meio de uma interface web temática, além de estudantes que desejam estudar integração entre Node.js, bibliotecas de sistema e aplicações web.

## 7. Limites conhecidos

As métricas coletadas pertencem à máquina onde o servidor está em execução. Em uma hospedagem remota, elas não representam automaticamente o computador de quem acessa o site.

O histórico de CPU e RAM é mantido em memória durante a execução do processo. Já as tarefas são armazenadas em arquivo JSON no diretório configurado por `DATA_DIR` ou, por padrão, na pasta do projeto.

A disponibilidade de temperatura, informações de rede e alguns dados de hardware depende do sistema operacional e do ambiente de execução.
