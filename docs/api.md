# Rotas HTTP

Este documento descreve as rotas identificadas no arquivo `server.js`.

## Resumo

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/` | Renderizar o painel com métricas do sistema |
| `GET` | `/health` | Verificar se o servidor está respondendo |
| `POST` | `/tarefas` | Adicionar uma tarefa |
| `POST` | `/tarefas/:id/toggle` | Alternar o estado de conclusão |
| `POST` | `/tarefas/:id/apagar` | Excluir uma tarefa |

## `GET /`

Retorna o HTML do painel após a coleta das informações disponíveis.

- Resposta de sucesso: `200` com HTML.
- Em caso de falha na coleta: `500`.
- A resposta utiliza `Cache-Control: no-store`.

## `GET /health`

Retorna o texto `ok` quando o servidor está respondendo.

## `POST /tarefas`

Adiciona uma tarefa.

Campos enviados como formulário:

| Campo | Tipo | Descrição |
|---|---|---|
| `texto` | texto | Descrição da tarefa; limitado a 80 caracteres |
| `diaria` | checkbox | Quando enviado como `on`, identifica a tarefa como diária |

O código limita a lista a 30 tarefas.

## `POST /tarefas/:id/toggle`

Localiza a tarefa pelo identificador e inverte seu estado `feita`.

## `POST /tarefas/:id/apagar`

Remove da lista a tarefa que corresponde ao identificador informado.

## Resposta das ações de tarefas

As rotas de alteração utilizam um comportamento diferente conforme o cabeçalho `x-live`:

- Com `x-live`, respondem com status `204`.
- Sem `x-live`, redirecionam com status `303` para `/#missoes`.

## Observações

Estas rotas são endpoints HTTP de formulário; o código consultado não apresenta uma API REST pública que retorne todas as métricas em JSON.

As rotas de tarefas não devem ser expostas sem avaliar controles de acesso e proteção adequados ao ambiente de implantação.
