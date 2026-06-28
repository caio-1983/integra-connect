# PD-006 --- Barra de Ações Operacionais

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Durante um atendimento, as ações mais importantes costumam ficar
escondidas em menus, painéis secundários ou distribuídas pela interface.

Isso aumenta o tempo de execução, dificulta o aprendizado e faz com que
funcionalidades essenciais sejam pouco utilizadas.

------------------------------------------------------------------------

# Contexto

Na evolução do Workspace foi definido que as ações operacionais devem
permanecer sempre acessíveis durante o atendimento.

O usuário não deve interromper a conversa para localizar funções
críticas.

------------------------------------------------------------------------

# Decisão

O Workspace passa a possuir uma **Barra de Ações Operacionais** fixa e
contextual.

Ela concentra as ações de maior frequência relacionadas ao atendimento
atual.

A barra não substitui menus avançados, mas reúne os comandos essenciais
para a operação diária.

------------------------------------------------------------------------

# Objetivos

-   Reduzir quantidade de cliques.
-   Tornar ações importantes sempre visíveis.
-   Aumentar produtividade.
-   Padronizar a experiência entre módulos.
-   Diminuir carga cognitiva.

------------------------------------------------------------------------

# Escopo

A Barra de Ações poderá conter, entre outras:

-   Novo Compromisso
-   Nova Oportunidade
-   Transferir Atendimento
-   Alterar Responsável
-   Aplicar Etiquetas
-   Consultar Histórico
-   Resumir Conversa (IA)
-   Encerrar Atendimento

A composição poderá evoluir conforme o contexto do Workspace.

------------------------------------------------------------------------

# Princípios Permanentes

-   Ações frequentes permanecem visíveis.
-   Ações raras permanecem em menus secundários.
-   A barra é contextual ao atendimento atual.
-   Ícones sempre acompanhados de texto quando representarem ações
    críticas.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Maior velocidade operacional.
-   Menor curva de aprendizagem.
-   Interface mais consistente.
-   Melhor descoberta de funcionalidades.

## Negativas

-   Exige curadoria para evitar excesso de ações.

------------------------------------------------------------------------

# Impacto

Esta decisão influencia:

-   Workspace
-   UX
-   Design System
-   Operações
-   Comercial

------------------------------------------------------------------------

# Relacionamentos

-   PD-005 --- Workspace como Centro da Operação
-   PD-004 --- Compromissos Operacionais
-   Architecture/03-workspace.md
-   Product/04-ux.md

------------------------------------------------------------------------

# Regra Permanente

Toda nova ação recorrente deverá ser avaliada para compor a Barra de
Ações Operacionais.

A barra deve permanecer simples, previsível e orientada às tarefas mais
frequentes do usuário.
