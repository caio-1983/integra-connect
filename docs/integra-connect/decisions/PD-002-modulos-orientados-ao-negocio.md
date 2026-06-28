# PD-002 --- Módulos Orientados ao Negócio

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Sistemas costumam organizar menus e funcionalidades com base em
tecnologias, telas ou componentes técnicos.

Essa abordagem aumenta a complexidade, dificulta a compreensão do
produto e gera sobreposição de responsabilidades.

------------------------------------------------------------------------

# Contexto

Durante a definição da arquitetura do Integra Connect foi decidido que a
plataforma deveria refletir a forma como uma empresa trabalha e não como
o software foi implementado.

A navegação deve representar áreas de negócio claramente identificáveis
pelo usuário.

------------------------------------------------------------------------

# Decisão

Todos os módulos do Integra Connect serão organizados por domínio de
negócio.

A estrutura principal da plataforma passa a ser composta por:

-   Operações
-   Atendimento
-   Clientes
-   Comercial
-   Analytics
-   Administração

Cada módulo possui responsabilidade própria e uma única fonte de
verdade.

------------------------------------------------------------------------

# Objetivos

-   Facilitar o aprendizado da plataforma.
-   Reduzir sobreposição de funcionalidades.
-   Permitir crescimento modular.
-   Melhorar a arquitetura de informação.
-   Tornar a navegação previsível.

------------------------------------------------------------------------

# Alternativas Consideradas

## Organização por tecnologia

Exemplo:

-   Chat
-   IA
-   WhatsApp
-   CRM

Rejeitada por misturar implementação com negócio.

## Organização por processo operacional

Aprovada por representar melhor a realidade das empresas.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Navegação intuitiva.
-   Baixo acoplamento entre módulos.
-   Escalabilidade.
-   Facilidade para novos desenvolvedores.

## Negativas

-   Algumas funcionalidades precisarão ser reposicionadas conforme o
    domínio correto.

------------------------------------------------------------------------

# Princípios Permanentes

-   Menus representam domínios de negócio.
-   Cada módulo possui responsabilidade única.
-   Nenhuma funcionalidade deve existir em dois módulos.
-   O usuário deve compreender imediatamente a finalidade de cada área
    da plataforma.

------------------------------------------------------------------------

# Impacto

Esta decisão influencia diretamente:

-   Arquitetura
-   UX
-   Navegação
-   Design System
-   Roadmap
-   Product Decisions futuras

------------------------------------------------------------------------

# Relacionamentos

Relaciona-se com:

-   Architecture/01-dominio.md
-   Architecture/02-modulos.md
-   Architecture/04-navegacao.md

------------------------------------------------------------------------

# Regra Permanente

Sempre que um novo módulo ou funcionalidade for criado, sua primeira
definição deverá ser o domínio de negócio ao qual pertence.

A implementação técnica será consequência dessa decisão, e nunca o
contrário.
