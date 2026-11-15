# Diagramas do sistema

Os diagramas abaixo representam o fluxo identificado no código atual.

## 1. Arquitetura simplificada

```mermaid
flowchart TD
    A[Pessoa usuária] -->|HTTP| B[Express - server.js]
    B --> C[Coleta de métricas]
    C --> D[systeminformation]
    C --> E[Node.js / os]
    B --> F[Renderização do template]
    F --> G[template.html]
    G --> H[HTML do painel]
    H --> A
    B --> I[tarefas.json]
```

## 2. Fluxo de carregamento do painel

```mermaid
sequenceDiagram
    participant N as Navegador
    participant E as Express
    participant S as systeminformation
    participant T as Template

    N->>E: GET /
    E->>S: Consultar recursos do sistema
    S-->>E: Métricas disponíveis
    E->>T: Aplicar valores ao template
    T-->>E: HTML renderizado
    E-->>N: Resposta HTML
```

## 3. Gerenciamento de tarefas

```mermaid
flowchart TD
    A[Formulário de tarefas] --> B{Ação}
    B -->|Adicionar| C[Validar texto e limite]
    C --> D[Salvar tarefas.json]
    B -->|Concluir / reabrir| E[Alternar campo feita]
    E --> D
    B -->|Excluir| F[Remover tarefa]
    F --> D
    D --> G[Finalizar requisição]
```
