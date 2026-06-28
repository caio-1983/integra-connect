# UI-003 --- Page Header Oficial do Integra Connect

## Objetivo

Definir um padrão único para o cabeçalho de todas as páginas do Integra
Connect.

O Page Header é responsável por contextualizar o usuário, apresentar o
objetivo da tela e concentrar as ações globais do módulo.

------------------------------------------------------------------------

# Estrutura

``` text
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumbs                                   Ações Globais │
├──────────────────────────────────────────────────────────────┤
│ Título da Página                                         CTA │
│ Descrição da página                                         │
└──────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# Componentes

-   Breadcrumbs (opcional)
-   Título
-   Descrição
-   Área de ações
-   Indicadores rápidos (quando necessário)

------------------------------------------------------------------------

# Regras

-   Toda página possui um único título.
-   A descrição deve explicar o propósito da tela em uma frase.
-   Ações globais ficam alinhadas à direita.
-   Não utilizar títulos genéricos como "Home" ou "Painel".

------------------------------------------------------------------------

# Tipografia

## Título

-   28px
-   SemiBold
-   Cor principal

## Descrição

-   14px
-   Regular
-   Cor secundária

------------------------------------------------------------------------

# Área de Ações

Pode conter:

-   Botão principal
-   Botões secundários
-   Exportar
-   Atualizar
-   Ajuda

Não incluir filtros ou busca nesta área.

Esses elementos pertencem à Toolbar.

------------------------------------------------------------------------

# Espaçamentos

-   Padding superior: 24px
-   Espaço entre título e descrição: 8px
-   Espaço entre header e toolbar: 24px

------------------------------------------------------------------------

# Estados

## Padrão

Título + descrição.

## Com ação

Título + descrição + botão principal.

## Com múltiplas ações

Título + descrição + grupo de ações.

------------------------------------------------------------------------

# Responsividade

Desktop: - Ações à direita.

Tablet: - Quebra em duas linhas quando necessário.

Mobile: - Botões abaixo do título.

------------------------------------------------------------------------

# Critérios de Aceite

-   Todas as páginas utilizam o mesmo Page Header.
-   Nenhuma tela cria cabeçalhos personalizados.
-   Ações permanecem consistentes entre módulos.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   Regras de negócio
-   Rotas
-   APIs
-   Estado global

Apenas padronizar a experiência visual.

------------------------------------------------------------------------

# Entregáveis

-   Componente PageHeader reutilizável.
-   Migração gradual das páginas.
-   Zero regressões visuais.
