# 📚 Documentação – Stardew Monitor

Documentação de requisitos e modelagem do **Stardew Monitor**, painel web de monitoramento de sistema com tema de fazenda (*Stardew Valley*), elaborada para a disciplina de Engenharia de Requisitos de Software da **Fatec Itapetininga** (Análise e Desenvolvimento de Sistemas, 2026).

**Equipe:** Ana, Ana, Evelyn e Giovana
**Orientador:** Deivison S. Takatu
**Projeto analisado:** <https://github.com/Milkaarz/Stardew-Monitor>

---

## 📄 Documento principal

`Stardew_Monitor_Projeto.docx` – trabalho completo em formato ABNT (43 páginas), seguindo o modelo da Fatec.

| Capítulo | Conteúdo |
|---|---|
| 1 Introdução | Contextualização, justificativa, objetivos e metodologia |
| 2 Fundamentação teórica | Estudos relacionados, conceitos-chave e soluções existentes |
| 3 Requisitos e proposta | Requisitos, solução, arquitetura, protótipo e documentação |
| 4 Resultados e discussão | Comparativo, métricas de sustentabilidade e limitações |
| 5 Considerações finais | Avaliação, lições aprendidas e trabalhos futuros |
| Apêndice A / Anexo A | Cronograma de atividades / Gráfico comparativo |

---

## 🧾 Artefatos de documentação

| Artefato | Onde está | Resumo |
|---|---|---|
| Requisitos funcionais | Quadro 3 | RF01 a RF15, com prioridade e origem |
| Requisitos não funcionais | Quadro 4 | RNF01 a RNF12, com critério de verificação (ISO/IEC 25010) |
| Regras de negócio | Quadro 5 e Tabela 1 | RN01 a RN05, incluindo os limiares normal/atenção/alerta |
| Histórias de usuário | Quadro 6 | US01 a US09, com critérios de aceitação |
| Casos de uso | Figura 1 e Quadro 7 | UC01 a UC08; UC01 especificado em detalhe |
| Arquitetura (componentes) | Figura 2 | Navegador, servidor Node.js, coletor de métricas e SO |
| Sequência | Figura 3 | Ciclo de atualização do painel |
| Protótipo (*wireframe*) | Figura 4 e Quadro 9 | Baixa fidelidade, com 7 elementos numerados |
| Diagrama de classes | Figura 5 | Modelo conceitual do domínio |
| Rastreabilidade | Quadro 10 | Necessidade → requisitos → histórias → casos de uso → interface |
| Decisões técnicas | Quadro 8 | Escolhas, alternativas e justificativas |
| Sustentabilidade | Quadro 11 e Tabelas 2 e 3 | Indicadores observados e impacto do recarregamento |
| Limitações e riscos | Quadro 12 | Riscos e encaminhamentos |

---

## 🔖 Convenções adotadas

- **Identificadores:** `RF` (funcional), `RNF` (não funcional), `RN` (regra de negócio), `US` (história de usuário), `UC` (caso de uso).
- **Prioridade (MoSCoW adaptado):** Essencial, Importante, Desejável.
- **Origem dos requisitos:**
  - *Repositório:* documentado ou observável no projeto.
  - *Grupo:* proposto pela equipe a partir da análise.
- **Correspondência temática fixa (RN05):** CPU = Energia, RAM = Mochila, disco = Silo, processos = Moradores de Pelican Town.
- **Limiares sugeridos (RN01):** normal abaixo de 60%, atenção de 60% a 84%, alerta a partir de 85%.

---

## 🔗 Como usar a rastreabilidade

1. Parta de uma necessidade no **Quadro 10**.
2. Localize os requisitos (Quadros 3, 4 e 5) e as histórias (Quadro 6).
3. Consulte o caso de uso (Figura 1 e Quadro 7) e o elemento do protótipo (Figura 4).
4. Ao alterar um requisito, revise todos os itens da mesma linha da matriz.

---

## ⚠️ Pendências e pontos a validar

- Os arquivos `server.js` e `template.html` **não foram analisados**. A arquitetura (cap. 3.2 e 3.3) e os requisitos **RF13 a RF15** são propostas e devem ser conferidos com o código.
- A **inspeção heurística** de usabilidade deve ser confirmada pelo grupo. Entrevistas, questionários e testes com usuários **não foram realizados**.
- As **notas da Tabela 2** (comparativo) são avaliação qualitativa do grupo, e não medição experimental.
- **Lighthouse, PageSpeed e GTmetrix** ainda não foram executados.
- Os valores da Tabela 3 são cálculos (86.400 s ÷ intervalo), e não medições.
- Complementar a capa com os **sobrenomes** das integrantes e conferir as **referências** (edição e ano) no catálogo da biblioteca.

---

## 🛠️ Manutenção da documentação

- Mantenha `Stardew_Monitor_Projeto.docx` e este README no repositório, por exemplo em uma pasta `docs/`.
- Atualize a matriz de rastreabilidade (Quadro 10) sempre que um requisito for criado, alterado ou removido.
- Registre mudanças de documentação em *commits* descritivos, separados dos *commits* de código.
- Depois de editar o `.docx`, atualize o sumário e as listas no Word (clique com o botão direito → *Atualizar campo*) para corrigir os números de página.
- Os diagramas do documento são imagens. Se forem refeitos, mantenha a numeração das figuras.

---

## 📚 Principais referências

Sommerville (2018), Pressman e Maxim (2021), Wazlawick (2015), Booch, Rumbaugh e Jacobson (2006), Cohn (2004), Nielsen (1993), Norman (2006), Few (2006), Deterding et al. (2011), Tanenbaum e Bos (2016), ABNT NBR ISO/IEC 25010 (2011) e ISO/IEC/IEEE 29148 (2018). A lista completa está na seção **Referências** do documento.
