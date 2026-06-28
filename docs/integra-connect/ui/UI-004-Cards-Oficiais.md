# UI-004 --- Cards Oficiais do Integra Connect

## Objetivo

Definir o padrão visual e funcional para todos os cards utilizados no
Integra Connect.

Os cards são a principal unidade de informação da plataforma e devem
transmitir clareza, organização e hierarquia.

------------------------------------------------------------------------

# Tipos de Card

## Card de KPI

Utilizado para indicadores rápidos.

Conteúdo: - Título - Valor principal - Variação (opcional) - Ícone
(opcional)

------------------------------------------------------------------------

## Card de Conteúdo

Utilizado para listas, tabelas, gráficos e formulários.

Estrutura:

-   Cabeçalho
-   Corpo
-   Rodapé (opcional)

------------------------------------------------------------------------

## Card de Ação

Utilizado para alertas, tarefas e chamadas para ação.

Pode conter:

-   Ícone
-   Título
-   Descrição
-   Botão principal

------------------------------------------------------------------------

# Estrutura

``` text
┌─────────────────────────────┐
│ Título                Ações │
├─────────────────────────────┤
│                             │
│ Conteúdo                    │
│                             │
├─────────────────────────────┤
│ Rodapé (opcional)           │
└─────────────────────────────┘
```

------------------------------------------------------------------------

# Estilo

-   Fundo: #FFFFFF
-   Borda: #E2E8F0
-   Border Radius: 12px
-   Padding interno: 20px
-   Sombra muito sutil

Evitar efeitos chamativos.

------------------------------------------------------------------------

# Tipografia

Título: - 16px - SemiBold

Conteúdo: - 14px - Regular

Texto auxiliar: - 12px - Cor secundária

------------------------------------------------------------------------

# Espaçamentos

-   Cabeçalho → Corpo: 16px
-   Corpo → Rodapé: 16px
-   Gap interno: 12px

------------------------------------------------------------------------

# Estados

## Padrão

Card em repouso.

## Hover

Leve alteração de borda ou sombra.

Não alterar escala.

## Selecionado

Realce discreto utilizando a cor institucional.

## Desabilitado

Redução de contraste.

------------------------------------------------------------------------

# Regras

-   Todos os cards seguem a mesma estrutura.
-   Não utilizar cores diferentes para cada módulo.
-   A informação é o destaque, não o efeito visual.

------------------------------------------------------------------------

# Responsividade

Desktop: - Grid flexível.

Tablet: - Reorganização em múltiplas linhas.

Mobile: - Cards ocupam largura total.

------------------------------------------------------------------------

# Critérios de Aceite

-   Todos os módulos reutilizam o mesmo padrão de card.
-   Não existem estilos paralelos.
-   Cards seguem o Design System.
-   Zero alteração funcional.

------------------------------------------------------------------------

# Restrições

Não alterar: - regras de negócio - APIs - rotas - estado global

Apenas padronizar os componentes visuais.

------------------------------------------------------------------------

# Entregáveis

-   Componentes reutilizáveis de Card.
-   Migração gradual das telas.
-   Zero regressões.
