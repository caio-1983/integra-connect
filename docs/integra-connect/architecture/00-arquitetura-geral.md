# 00 - Arquitetura Geral

# Objetivo

Este documento descreve a arquitetura conceitual do Integra Connect.

Seu propósito é definir os módulos do produto, suas responsabilidades e
os princípios que orientam sua evolução.

Não descreve tecnologias, banco de dados ou implementação.

------------------------------------------------------------------------

# Visão Geral

O Integra Connect é uma plataforma SaaS B2B orientada por domínios de
negócio.

Cada módulo possui uma responsabilidade única e uma única fonte de
verdade.

A plataforma evolui por módulos independentes, reduzindo acoplamento e
facilitando manutenção.

------------------------------------------------------------------------

# Arquitetura Conceitual

``` text
                  Integra Connect

                        │
        ┌───────────────┼────────────────┐
        │               │                │
   Atendimento      Operações        Clientes
        │               │                │
        ├───────────────┼────────────────┤
        │               │                │
    Comercial      Analytics      Administração
```

------------------------------------------------------------------------

# Módulos

## Atendimento

Responsável pela comunicação em tempo real.

Inclui:

-   Workspace
-   Conversas
-   Resumo do atendimento
-   Transferências
-   Etiquetas operacionais

------------------------------------------------------------------------

## Operações

Responsável pelas ações que precisam ser executadas.

Inclui:

-   Compromissos
-   Retornos
-   Pendências
-   Alertas
-   Acompanhamentos

------------------------------------------------------------------------

## Clientes

Responsável pelo relacionamento permanente.

Inclui:

-   Cadastro
-   Histórico consolidado
-   Perfil
-   Linha do tempo
-   Segmentação

------------------------------------------------------------------------

## Comercial

Responsável pelo ciclo de oportunidades.

Inclui:

-   Oportunidades
-   Pipeline
-   Propostas
-   Fechamentos

------------------------------------------------------------------------

## Analytics

Responsável por indicadores e gestão.

Inclui:

-   KPIs
-   Dashboards
-   Produtividade
-   SLA
-   Conversão

------------------------------------------------------------------------

## Administração

Responsável pela configuração da plataforma.

Inclui:

-   Usuários
-   Permissões
-   Canais
-   Integrações
-   Configurações

------------------------------------------------------------------------

# Princípios Arquiteturais

-   Cada módulo possui responsabilidade única.
-   Nenhuma informação deve possuir duas fontes de verdade.
-   Componentes devem ser reutilizados sempre que possível.
-   O Workspace representa a operação em tempo real.
-   Clientes representa a memória permanente do relacionamento.
-   A navegação deve refletir o domínio do negócio, nunca a tecnologia
    utilizada.

------------------------------------------------------------------------

# Evolução

Novos módulos poderão ser adicionados sem alterar a arquitetura
existente, desde que respeitem:

-   separação de responsabilidades;
-   baixo acoplamento;
-   consistência de UX;
-   identidade do Integra Connect.

------------------------------------------------------------------------

# Regra Permanente

Toda nova funcionalidade deve ser alocada primeiro ao domínio correto
antes de qualquer decisão técnica.

A arquitetura do produto é guiada pelo negócio, não pela implementação.
