# 🌾 Stardew Monitor

O **Stardew Monitor** é um painel web de monitoramento de sistema com
uma interface inspirada em *Stardew Valley*. Ele apresenta informações
técnicas usando elementos visuais de fazenda, pixel art, placas de
madeira e pergaminhos.

## 📌 Objetivo

O site organiza informações de uso do sistema em um painel temático,
facilitando a visualização de recursos, processos em execução e
mensagens de status.

## 🖥️ O que aparece no painel

### 1. Cena da fazenda

Uma ilustração em pixel art com casa, árvores, plantações, espantalho,
galinhas, flores e céu. Ela serve como elemento visual central do tema.

### 2. Data e localização

Uma placa exibe informações de data, horário e nome da fazenda.

### 3. Recursos da fazenda

O painel mostra três indicadores em formato de barras:

-   **Energia:** exibe uma porcentagem e um indicador de uso da CPU.
-   **Mochila:** representa o uso da memória RAM, com quantidade
    utilizada e percentual.
-   **Silo:** representa o armazenamento em disco, mostrando espaço
    utilizado e capacidade total.

As cores das barras distinguem estados visuais, como normal, atenção e
alerta.

### 4. Mensagem de status

Um cartão apresenta uma mensagem sobre a situação geral da
fazenda/sistema.

### 5. Moradores de Pelican Town

Uma tabela apresenta informações de processos do sistema:

-   **PID:** identificador do processo.
-   **Usuário:** usuário associado ao processo.
-   **CPU:** percentual de processamento utilizado.
-   **MEM:** percentual de memória utilizado.
-   **Processo:** nome do processo em execução.

### 6. Diário da fazenda

Uma área de texto destinada a anotações. Quando está vazia, exibe a
mensagem "Nenhuma anotação hoje...".

### 7. Rodapé

Mostra a data e o horário da última atualização informada no painel.

## 🧰 Tecnologias utilizadas

-   **HTML5:** estrutura e organização do conteúdo.
-   **CSS3:** cores, layout, cartões, barras de recursos, responsividade
    e animações.
-   **SVG:** criação da cena da fazenda em pixel art diretamente no
    documento.
-   **Google Fonts:** fontes `Press Start 2P` e `VT323`, usadas para
    reforçar a estética retrô.

O arquivo contém HTML e CSS no mesmo documento (`Painel Stardew.html`),
sem uma estrutura de projeto separada visível no arquivo analisado.

## 🎨 Identidade visual

O visual combina elementos de jogos retrô com uma paleta inspirada em
madeira, pergaminho, vegetação e ouro. As bordas espessas, sombras,
fontes pixeladas e animações discretas reforçam a aparência de um painel
de jogo.

O layout também inclui regras para telas menores, reorganizando os
indicadores e os cartões para melhorar a leitura em dispositivos
estreitos. Há ainda uma configuração para desativar algumas animações
quando o sistema do usuário prefere movimento reduzido.

## 🔄 Atualização automática

O documento contém uma configuração HTML para recarregar a página a cada
**5 segundos**.

**Importante:** o recarregamento, por si só, não coleta nem atualiza
dados do sistema. No arquivo analisado, os valores exibidos estão
escritos diretamente no HTML e não há código JavaScript visível que os
consulte automaticamente. Para mostrar métricas reais e atualizadas, o
painel precisa receber dados de uma fonte externa, como um serviço ou
uma API que obtenha as informações do sistema.

## 🚀 Como abrir

1.  Salve o arquivo `Painel Stardew.html` no computador.
2.  Abra o arquivo em um navegador moderno, como Chrome, Firefox ou
    Edge.
3.  O painel será exibido no navegador.

Como o arquivo inclui sua própria estrutura e estilos, não é necessário
compilar o HTML para visualizar a interface. É necessária uma conexão
com a internet para carregar as fontes hospedadas no Google Fonts; caso
contrário, o navegador usará as fontes alternativas definidas no CSS.

## 📁 Estrutura do arquivo

O arquivo está organizado em partes principais:

-   **Cabeçalho (`head`):** define codificação, configuração para
    dispositivos móveis, título, fontes e estilos CSS.
-   **Corpo (`body`):** contém o título do painel, a ilustração SVG, os
    indicadores de recursos, a tabela de processos, o diário e o rodapé.
-   **CSS embutido:** controla a aparência, as cores, o posicionamento,
    as animações e os ajustes para telas menores.

## ⚠️ Observação sobre os dados

Os números e nomes mostrados no painel são os valores presentes no HTML
analisado. Não devem ser considerados métricas em tempo real apenas
porque a página recarrega automaticamente. Para transformar o projeto em
um monitor funcional, será necessário conectar os componentes visuais a
uma fonte que forneça dados reais.

------------------------------------------------------------------------

*Stardew Monitor --- monitoramento de sistema com clima de fazenda e
estética pixel art.*
