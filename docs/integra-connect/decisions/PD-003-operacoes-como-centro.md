# PD-003 --- Operações como Centro da Gestão Diária

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Equipes de atendimento e vendas frequentemente perdem prazos, esquecem
retornos e executam atividades sem uma visão consolidada das prioridades
do dia.

As informações ficam espalhadas entre conversas, planilhas e memória das
pessoas.

------------------------------------------------------------------------

# Contexto

Durante a definição do Integra Connect foi identificado que uma central
de mensagens não é suficiente para organizar a operação.

O produto precisa oferecer uma visão clara das ações pendentes antes
mesmo da abertura de uma conversa.

------------------------------------------------------------------------

# Decisão

O módulo **Operações** passa a ser o ponto de entrada da gestão diária.

Ele consolida tudo o que exige ação da equipe, independentemente do
canal de origem.

O módulo não substitui o Atendimento, mas orienta a execução do
trabalho.

------------------------------------------------------------------------

# Objetivos

-   Eliminar dependência da memória.
-   Priorizar atividades.
-   Centralizar compromissos e pendências.
-   Reduzir perdas de oportunidades.
-   Aumentar previsibilidade operacional.

------------------------------------------------------------------------

# Escopo

O módulo Operações poderá concentrar:

-   Compromissos agendados.
-   Retornos pendentes.
-   Pendências vencidas.
-   Alertas operacionais.
-   Atividades do dia.
-   Indicadores rápidos.

------------------------------------------------------------------------

# Alternativas Consideradas

## Utilizar apenas notificações

Rejeitada por não fornecer visão consolidada.

## Operações como módulo dedicado

Aprovada por oferecer organização e priorização contínuas.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Maior controle da rotina.
-   Menor perda de oportunidades.
-   Melhor acompanhamento da equipe.
-   Visão única das prioridades.

## Negativas

-   Exige disciplina na criação e encerramento das ações.

------------------------------------------------------------------------

# Princípios Permanentes

-   Nenhuma atividade importante deve depender da memória humana.
-   Toda ação futura deve estar registrada.
-   O usuário deve compreender rapidamente o que precisa executar hoje.

------------------------------------------------------------------------

# Impacto

Esta decisão influencia:

-   Workspace
-   Compromissos
-   Comercial
-   Analytics
-   Dashboard Operacional

------------------------------------------------------------------------

# Relacionamentos

Relaciona-se com:

-   Architecture/03-workspace.md
-   Architecture/05-fluxos.md
-   PD-004-compromissos-operacionais.md

------------------------------------------------------------------------

# Regra Permanente

Sempre que uma conversa gerar uma ação futura, essa ação deverá
tornar-se visível no módulo Operações até sua conclusão ou cancelamento.
