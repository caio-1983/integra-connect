# 05 - Design System

# Objetivo

O Design System do Integra Connect garante consistência visual,
previsibilidade e escalabilidade.

Toda nova interface deve reutilizar componentes existentes antes de
criar novos.

------------------------------------------------------------------------

# Princípios

-   Clareza acima de decoração.
-   Consistência acima de criatividade.
-   Reutilização acima de duplicação.
-   Espaçamento consistente.
-   Estados previsíveis.

------------------------------------------------------------------------

# Temas

## Preferência

Tema claro como padrão.

O tema escuro poderá existir futuramente, mas todas as decisões de UX
devem considerar inicialmente o tema claro.

------------------------------------------------------------------------

# Grid

-   Espaçamentos em múltiplos de 4 e 8 px.
-   Containers bem definidos.
-   Alinhamentos consistentes.

------------------------------------------------------------------------

# Tipografia

## Hierarquia

-   H1 --- título da página
-   H2 --- seção
-   H3 --- subtítulo
-   Body --- conteúdo
-   Caption --- informações auxiliares

Evitar excesso de pesos e tamanhos.

------------------------------------------------------------------------

# Cores

## Primárias

Utilizadas para ações principais e identidade.

## Semânticas

-   Sucesso
-   Atenção
-   Erro
-   Informação

Nunca utilizar cor apenas como único indicador de estado.

------------------------------------------------------------------------

# Componentes Base

Todos os módulos devem priorizar componentes reutilizáveis.

Exemplos:

-   Button
-   Input
-   Select
-   Badge
-   Card
-   Tabs
-   Dialog
-   Tooltip
-   Table
-   Sidebar
-   Empty State

------------------------------------------------------------------------

# Estados

Todo componente deve prever:

-   Default
-   Hover
-   Focus
-   Active
-   Disabled
-   Loading
-   Error

------------------------------------------------------------------------

# Ícones

Padrão: Lucide React.

Sempre acompanhados de texto quando representarem ações importantes.

------------------------------------------------------------------------

# Workspace

Estrutura padrão:

1.  Cabeçalho
2.  Barra de ações
3.  Conteúdo principal
4.  Painel contextual

Essa organização deve ser reutilizada em todos os módulos.

------------------------------------------------------------------------

# Responsividade

O produto deve manter consistência em diferentes resoluções.

A prioridade é desktop corporativo, mas os componentes devem permitir
adaptação futura para tablets e dispositivos móveis.

------------------------------------------------------------------------

# Regra Permanente

Antes de criar um novo componente, verificar se o comportamento pode ser
obtido reutilizando componentes já existentes.

A evolução do Design System deve reduzir complexidade, nunca aumentá-la.
