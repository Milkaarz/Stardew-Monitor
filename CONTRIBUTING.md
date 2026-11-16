# Como contribuir

Obrigado pelo interesse em contribuir com o Stardew Monitor! Toda contribuição construtiva é bem-vinda, seja uma correção, melhoria visual, documentação ou sugestão.

## Antes de começar

1. Leia o [README](README.md) para conhecer o projeto.
2. Consulte o [Código de Conduta](CODE_OF_CONDUCT.md).
3. Verifique as Issues abertas para evitar trabalho duplicado.
4. Se a mudança for grande, abra uma Issue para discutir a proposta antes de implementá-la.

## Preparar o ambiente

Requisitos:

- Node.js 18 ou superior.
- npm.

```bash
git clone https://github.com/Milkaarz/Stardew-Monitor.git
cd Stardew-Monitor
npm install
npm start
```

A aplicação deverá estar disponível em `http://localhost:3000`.

## Fluxo recomendado

1. Faça um fork do repositório.
2. Crie uma branch com um nome descritivo:

   ```bash
   git switch -c feat/nova-funcionalidade
   ```

3. Implemente a alteração mantendo o padrão existente.
4. Execute a aplicação localmente e verifique o comportamento alterado.
5. Revise o diff para remover arquivos temporários, logs e dados locais.
6. Faça commits objetivos.
7. Envie a branch ao seu fork e abra uma Pull Request.

## Padrões para contribuições

### Código

- Prefira nomes claros e consistentes.
- Mantenha as responsabilidades de cada parte do sistema bem definidas.
- Evite adicionar dependências sem necessidade.
- Trate falhas de coleta de informações sem derrubar toda a aplicação.
- Preserve a compatibilidade com Node.js 18 ou superior.
- Não inclua credenciais, dados pessoais ou informações específicas da sua máquina.

### Interface

- Preserve a identidade visual inspirada em Stardew Valley.
- Mantenha a interface utilizável em telas menores.
- Garanta contraste e legibilidade.
- Evite animações excessivas e respeite a preferência por movimento reduzido quando aplicável.

### Documentação

- Atualize o README ou os documentos em `docs/` quando uma mudança alterar instalação, configuração, funcionalidades, rotas ou arquitetura.
- Inclua exemplos reproduzíveis.
- Não documente como existente uma funcionalidade que ainda não foi implementada.

## Commits

Use mensagens curtas e descritivas. Exemplos:

```text
feat: adiciona indicador de temperatura
fix: corrige leitura de armazenamento
docs: atualiza instruções de instalação
style: ajusta responsividade do painel
refactor: organiza coleta de métricas
```

## Pull Requests

Uma Pull Request deve:

- Explicar o problema ou necessidade.
- Descrever o que foi alterado.
- Informar como a alteração foi testada.
- Relacionar a Issue correspondente, se houver.
- Incluir capturas de tela quando houver mudanças visuais.
- Informar limitações conhecidas ou tarefas que ficaram pendentes.

## Checklist antes de enviar

- [ ] A aplicação inicia com `npm start`.
- [ ] A alteração foi testada no ambiente local.
- [ ] Não foram adicionados segredos ou arquivos pessoais.
- [ ] A documentação foi atualizada quando necessário.
- [ ] A interface continua legível em telas menores.
- [ ] A Pull Request explica claramente a mudança.

## Dúvidas

Se não souber por onde começar, abra uma Issue descrevendo sua dúvida ou a melhoria que gostaria de propor.

Obrigado por ajudar a cultivar este projeto! 🌱
