# PD-007 --- Workspace e Clientes possuem responsabilidades distintas

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Em plataformas de atendimento é comum misturar informações operacionais
e cadastrais no mesmo ambiente.

Isso gera duplicidade, responsabilidades confusas e aumenta o
acoplamento entre módulos.

------------------------------------------------------------------------

# Contexto

Durante a evolução do Integra Connect foi identificado que o Workspace
estava assumindo responsabilidades próprias do módulo Clientes.

A arquitetura foi revisada para separar claramente operação em tempo
real do relacionamento permanente.

------------------------------------------------------------------------

# Decisão

Workspace e Clientes passam a possuir responsabilidades distintas.

## Workspace

Representa a operação em tempo real.

Responde:

> "O que preciso fazer agora?"

Inclui:

-   Conversa
-   Resumo do atendimento
-   Barra de ações
-   Compromissos (consulta/criação)
-   Oportunidades (consulta/criação)
-   Contexto operacional

## Clientes

Representa a memória permanente do relacionamento.

Responde:

> "Quem é esta pessoa para a empresa?"

Inclui:

-   Cadastro
-   Telefones
-   E-mails
-   Segmentação
-   Responsável
-   Histórico consolidado
-   Linha do tempo
-   Perfil

------------------------------------------------------------------------

# Objetivos

-   Eliminar sobreposição entre módulos.
-   Definir uma única fonte de verdade.
-   Facilitar evolução independente.
-   Melhorar a experiência do usuário.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Arquitetura mais limpa.
-   UX consistente.
-   Menor duplicidade.
-   Maior escalabilidade.

## Negativas

-   Algumas funcionalidades precisarão ser redistribuídas entre módulos.

------------------------------------------------------------------------

# Princípios Permanentes

-   Workspace representa o presente da operação.
-   Clientes representa a memória permanente.
-   Operações representa ações futuras.
-   Comercial representa negociações.
-   Nenhuma informação permanente deve ter duas fontes de verdade.

------------------------------------------------------------------------

# Impacto

Esta decisão influencia:

-   Atendimento
-   Clientes
-   Operações
-   Comercial
-   UX
-   Design System
-   Arquitetura

------------------------------------------------------------------------

# Relacionamentos

-   PD-005 --- Workspace como Centro da Operação
-   PD-006 --- Barra de Ações Operacionais
-   Architecture/01-dominio.md
-   Architecture/03-workspace.md

------------------------------------------------------------------------

# Regra Permanente

Toda funcionalidade nova deverá ser classificada primeiro em um domínio
de negócio.

Se a informação representa o atendimento em andamento, pertence ao
Workspace.

Se representa conhecimento permanente sobre a pessoa ou empresa,
pertence ao módulo Clientes.
