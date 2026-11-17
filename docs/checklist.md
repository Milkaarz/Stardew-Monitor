# Checklist de revisão

Use antes de publicar alterações ou uma nova versão.

## Código

- [ ] `npm run check` passa (lint + testes + build).
- [ ] Mudanças no banco estão numa **nova** migration.
- [ ] Toda entrada nova da API tem esquema de validação.
- [ ] Ações administrativas novas registram auditoria.
- [ ] Nenhum valor fictício: sensor ausente aparece como indisponível.
- [ ] Nada de segredo no frontend, em logs ou em respostas da API.

## Interface

- [ ] Funciona em ~400 px de largura (celular) e em telas largas.
- [ ] Elementos clicáveis da fazenda respondem a teclado (Enter/Espaço) e têm descrição.
- [ ] Testado com "Reduzir animações".
- [ ] Testado em pelo menos dois temas (um claro e Minas).

## Documentação

- [ ] README e `docs/` refletem o comportamento atual.
- [ ] Variáveis novas estão no `.env.example`.
- [ ] Rotas novas estão em `docs/api.md`.

## Publicação

- [ ] CI verde (Linux, Windows, PostgreSQL, Docker).
- [ ] `APP_SECRET` e `ADMIN_PASSWORD` definidos no ambiente de produção.
- [ ] HTTPS na frente do servidor; agentes usando `https://`.
- [ ] Backup do banco antes de atualizar.
