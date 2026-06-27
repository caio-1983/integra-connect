# 03 - Workspace

# Workspace de Atendimento

## Objetivo

O Workspace é o centro operacional do Integra Connect.

É nele que o usuário executa o atendimento em tempo real, toma decisões
e transforma conversas em ações.

O Workspace não é um cadastro de clientes e não substitui o módulo
Comercial.

------------------------------------------------------------------------

# Papel do Workspace

Responder continuamente à pergunta:

> **"O que preciso fazer agora?"**

Toda informação exibida deve apoiar essa decisão.

------------------------------------------------------------------------

# Estrutura

``` text
┌────────────────────────────────────────────┐
│ Sidebar Global                             │
├──────────────┬─────────────────────────────┤
│ Conversas    │ Conversa                    │
│              │                             │
│              │ Mensagens                   │
│              │                             │
│              │ Campo de resposta           │
├──────────────┼─────────────────────────────┤
│              │ Workspace do Cliente        │
│              │                             │
│              │ Contato                     │
│              │ Compromissos                │
│              │ Comercial                   │
│              │ Histórico                   │
└──────────────┴─────────────────────────────┘
```

------------------------------------------------------------------------

# Componentes

## Lista de Conversas

-   Busca
-   Filtros
-   Indicadores
-   Status

------------------------------------------------------------------------

## Conversa

-   Histórico de mensagens
-   Anexos
-   Áudios
-   Envio de mensagens

------------------------------------------------------------------------

## Cabeçalho

Exibe:

-   Nome
-   Canal
-   Status
-   Responsável

------------------------------------------------------------------------

## Barra de Ações

Reservada para ações operacionais:

-   Novo compromisso
-   Nova oportunidade
-   Transferir
-   Etiquetas

As ações frequentes devem permanecer visíveis.

------------------------------------------------------------------------

## Painel do Cliente

Organizado em abas:

### Contato

Informações operacionais e resumo.

### Compromissos

Ações futuras.

### Comercial

Oportunidades relacionadas.

### Histórico

Linha do tempo consolidada.

------------------------------------------------------------------------

# Limites

O Workspace NÃO deve editar o cadastro completo do cliente.

Essas alterações pertencem ao módulo Clientes.

O Workspace consulta informações; o módulo Clientes é a fonte oficial
dos dados permanentes.

------------------------------------------------------------------------

# Integração

O Workspace pode criar:

-   Compromissos
-   Oportunidades
-   Etiquetas
-   Resumos

Mas não deve concentrar funcionalidades de outros módulos.

------------------------------------------------------------------------

# Princípios

-   Operação em tempo real.
-   Ações sempre visíveis.
-   Baixa carga cognitiva.
-   Contexto permanente.
-   Integração entre módulos sem duplicação.

------------------------------------------------------------------------

# Regra Permanente

O Workspace representa o presente da operação.

Toda informação permanente pertence ao módulo Clientes.

Toda ação futura pertence ao módulo Operações.

Toda negociação pertence ao módulo Comercial.
