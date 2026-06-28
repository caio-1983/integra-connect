# UI-005 --- Workspace Oficial do Integra Connect

## Objetivo

Definir o padrão visual e funcional do Workspace de Atendimento, o
principal ambiente operacional do Integra Connect.

O Workspace deve permitir que o atendente execute todo o atendimento sem
trocar de tela.

------------------------------------------------------------------------

# Estrutura

``` text
┌─────────────────────────────────────────────────────────────────────────┐
│ Header da Conversa                                           Ações      │
├───────────────┬───────────────────────────────────┬─────────────────────┤
│ Lista de      │ Timeline de Mensagens             │ Workspace do Cliente │
│ Conversas     │                                   │                     │
│               │                                   │ Resumo              │
│               │                                   │ Dados               │
│               │                                   │ Tags                │
│               │                                   │ Histórico           │
├───────────────┴───────────────────────────────────┴─────────────────────┤
│ Campo de resposta                                               Enviar  │
└─────────────────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# Componentes

-   ConversationList
-   ConversationHeader
-   MessageTimeline
-   MessageBubble
-   MessageComposer
-   WorkspacePanel
-   EmptyState

------------------------------------------------------------------------

# Regras

-   O foco principal é a conversa.
-   O painel lateral nunca sobrepõe a conversa.
-   O envio de mensagens permanece sempre visível.
-   A troca de conversa preserva a consistência visual.

------------------------------------------------------------------------

# Layout

## Coluna esquerda

-   Lista de conversas
-   Busca
-   Filtros

## Coluna central

-   Header
-   Timeline
-   Composer

## Coluna direita

-   Resumo do atendimento
-   Informações do cliente
-   Histórico
-   Abas preparadas para futuras expansões

------------------------------------------------------------------------

# Tipografia

Título: 16px SemiBold

Texto: 14px

Metadados: 12px

------------------------------------------------------------------------

# Espaçamentos

-   Padding geral: 24px
-   Gap entre colunas: 24px
-   Cards internos: 16px

------------------------------------------------------------------------

# Estados

-   Conversa selecionada
-   Conversa sem mensagens
-   Nenhuma conversa selecionada
-   Carregando
-   Erro

------------------------------------------------------------------------

# Responsividade

Desktop: - Três colunas.

Tablet: - Painel lateral recolhível.

Mobile: - Uma coluna com navegação entre listas e conversa.

------------------------------------------------------------------------

# Critérios de Aceite

-   Workspace único para todo atendimento.
-   Nenhuma funcionalidade duplicada.
-   Painel lateral reutilizável.
-   Layout consistente com UI-001 a UI-004.
-   Zero alteração de regras de negócio.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   APIs
-   Rotas
-   Hooks
-   Realtime
-   Polling
-   Estado global

Apenas evoluir a experiência visual e a organização do Workspace.

------------------------------------------------------------------------

# Entregáveis

-   Workspace padronizado.
-   Componentes reutilizáveis.
-   Migração sem regressões.
