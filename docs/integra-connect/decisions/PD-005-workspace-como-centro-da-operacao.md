# PD-005 --- Workspace como Centro da Operação

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Em muitas plataformas o atendimento é tratado apenas como uma troca de
mensagens.

O operador precisa alternar entre diversas telas para consultar
informações, registrar ações e tomar decisões, aumentando a carga
cognitiva e reduzindo a produtividade.

------------------------------------------------------------------------

# Contexto

Durante a evolução do Integra Connect foi definido que o atendimento
deve acontecer em um ambiente único, reunindo conversa, contexto e ações
operacionais.

Esse ambiente passa a ser denominado **Workspace**.

------------------------------------------------------------------------

# Decisão

O Workspace torna-se o centro operacional do atendimento.

Toda interação em tempo real deve acontecer dentro dele.

O Workspace integra informações de outros módulos, mas não substitui
suas responsabilidades.

------------------------------------------------------------------------

# Objetivos

-   Centralizar a operação.
-   Reduzir troca de telas.
-   Diminuir carga cognitiva.
-   Aumentar produtividade.
-   Disponibilizar contexto durante todo o atendimento.

------------------------------------------------------------------------

# Responsabilidades

O Workspace é responsável por:

-   Conversa em tempo real.
-   Resumo do atendimento.
-   Consulta de informações do cliente.
-   Criação de compromissos.
-   Criação de oportunidades.
-   Acesso ao histórico.

------------------------------------------------------------------------

# Limites

O Workspace **não** é responsável por:

-   Editar o cadastro completo do cliente.
-   Gerenciar pipeline comercial.
-   Configurar a plataforma.
-   Consolidar indicadores.

Essas responsabilidades pertencem aos respectivos módulos.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Atendimento mais rápido.
-   Menor necessidade de navegação.
-   Melhor experiência do usuário.
-   Arquitetura modular.

## Negativas

-   Exige integração consistente entre módulos.

------------------------------------------------------------------------

# Princípios Permanentes

-   Workspace representa o presente da operação.
-   Clientes representa o relacionamento permanente.
-   Operações representa ações futuras.
-   Comercial representa negociações.

------------------------------------------------------------------------

# Impacto

Esta decisão influencia:

-   Atendimento
-   Clientes
-   Operações
-   Comercial
-   UX
-   Design System

------------------------------------------------------------------------

# Relacionamentos

-   PD-003 --- Operações como Centro da Gestão Diária
-   PD-004 --- Compromissos Operacionais
-   Architecture/03-workspace.md

------------------------------------------------------------------------

# Regra Permanente

Toda funcionalidade relacionada ao atendimento em tempo real deve ser
avaliada primeiro sob a perspectiva do Workspace.

O Workspace é o centro operacional da plataforma, nunca um repositório
de funcionalidades sem responsabilidade definida.
