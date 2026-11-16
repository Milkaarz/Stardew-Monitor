# Arquitetura do sistema

## 1. Visão geral

O Stardew Monitor utiliza uma arquitetura web simples, composta por uma interface HTML/CSS, um servidor Node.js com Express e a biblioteca `systeminformation` para consultar métricas do ambiente.

## 2. Componentes

| Componente | Responsabilidade |
|---|---|
| `server.js` | Inicialização do Express, coleta de métricas, renderização e rotas |
| `template.html` | Estrutura visual utilizada como modelo |
| `aplicar-template.js` | Processamento complementar aplicado ao template |
| `Painel Stardew.html` | Arquivo HTML presente no repositório |
| `systeminformation` | Consulta de CPU, memória, discos, processos e rede |
| `tarefas.json` | Arquivo de persistência das tarefas, criado conforme necessário |

## 3. Fluxo de consulta

1. O navegador solicita a página inicial.
2. O Express recebe a requisição `GET /`.
3. O servidor consulta os dados do sistema usando `systeminformation`.
4. Os valores são organizados e transformados em conteúdo para o template.
5. O servidor envia o HTML renderizado ao navegador.

## 4. Coleta e histórico

O servidor consulta CPU, memória, discos, processos, temperatura e rede. Algumas informações podem não estar disponíveis em todos os ambientes.

As amostras de CPU e RAM são registradas em memória a cada 10 segundos, com limite de 40 amostras por indicador. Esse histórico não é um banco de dados permanente e é perdido quando o processo é reiniciado.

## 5. Persistência de tarefas

As tarefas são lidas e gravadas em `tarefas.json`. O diretório pode ser alterado pela variável `DATA_DIR`.

O arquivo contém a data de referência e a lista de tarefas. Tarefas diárias têm seu estado de conclusão reiniciado quando o sistema identifica uma nova data.

## 6. Estados de utilização

O código classifica os indicadores em três níveis:

| Estado | Condição |
|---|---|
| Normal (`ok`) | Abaixo de 70% |
| Atenção (`aviso`) | De 70% até menos de 90% |
| Alerta (`alerta`) | 90% ou mais |

A situação geral considera o pior estado entre os indicadores avaliados.

## 7. Observações de implantação

Se o serviço for hospedado em ambiente remoto, a coleta ocorrerá nesse ambiente. Para monitorar outro computador, seria necessário executar o serviço de coleta na máquina desejada e projetar uma comunicação segura entre esse serviço e a interface.
