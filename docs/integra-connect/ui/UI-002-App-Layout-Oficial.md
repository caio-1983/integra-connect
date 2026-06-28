# UI-002 --- App Layout Oficial do Integra Connect

## Objetivo

Definir o layout base utilizado por todas as telas do Integra Connect.

Este documento elimina variações entre módulos e estabelece um padrão
único de organização visual.

------------------------------------------------------------------------

# Estrutura

``` text
┌─────────────────────────────────────────────────────────────┐
│ Sidebar                                                     │
├─────────────────────────────────────────────────────────────┤
│ Breadcrumbs                                  Ações Globais  │
├─────────────────────────────────────────────────────────────┤
│ Título da Página                                         │
│ Descrição curta                                          │
├─────────────────────────────────────────────────────────────┤
│ KPIs (opcional)                                           │
├─────────────────────────────────────────────────────────────┤
│ Toolbar / Filtros / Busca / Botões                        │
├─────────────────────────────────────────────────────────────┤
│ Conteúdo Principal                                        │
└─────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# Componentes

-   AppLayout
-   PageHeader
-   Breadcrumbs
-   KPIBar
-   PageToolbar
-   ContentContainer
-   EmptyState

------------------------------------------------------------------------

# Regras

-   Todas as páginas utilizam o mesmo layout.
-   O título identifica claramente o módulo.
-   A descrição explica o objetivo da tela.
-   KPIs são opcionais e aparecem apenas quando agregam valor.
-   A Toolbar concentra filtros, busca e ações.
-   O conteúdo ocupa o restante da área útil.

------------------------------------------------------------------------

# Espaçamentos

-   Padding externo: 24px
-   Espaço entre seções: 24px
-   Gap interno de componentes: 16px
-   Cards: raio 12px

------------------------------------------------------------------------

# Tipografia

## Título

-   28px
-   Semibold

## Descrição

-   14px
-   Regular
-   Cor secundária

## Toolbar

-   14px

------------------------------------------------------------------------

# Responsividade

Desktop: - Sidebar fixa - Conteúdo fluido

Tablet: - Sidebar recolhível

Mobile: - Sidebar em Drawer

------------------------------------------------------------------------

# Critérios de Aceite

-   Todas as telas reutilizam AppLayout.
-   Não existem layouts paralelos.
-   Header, Toolbar e Conteúdo seguem o mesmo padrão.
-   Zero alteração de regras de negócio.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   Rotas
-   Lógica de negócio
-   Estado global
-   APIs
-   Autenticação

Apenas padronizar a estrutura visual.

------------------------------------------------------------------------

# Entregáveis

-   Componentes criados ou reutilizados.
-   Lista de telas migradas.
-   Confirmação de ausência de regressões.
