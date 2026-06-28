# 04 - SPEC Operações

## Status

Aprovada

------------------------------------------------------------------------

# Objetivo

Definir o comportamento funcional do módulo **Operações**, responsável
por organizar, priorizar e acompanhar todas as ações futuras geradas
pela empresa.

O módulo Operações garante que nenhuma atividade importante dependa da
memória das pessoas.

------------------------------------------------------------------------

# Problema de Negócio

Após um atendimento surgem diversas atividades:

-   retornar para o cliente;
-   enviar orçamento;
-   confirmar visita;
-   acompanhar proposta;
-   cobrar documentos.

Sem uma visão centralizada essas ações são esquecidas, causando perda de
vendas, atrasos e queda na qualidade do atendimento.

------------------------------------------------------------------------

# Responsabilidade

O módulo Operações é responsável por:

-   Centralizar compromissos.
-   Exibir pendências.
-   Priorizar atividades.
-   Mostrar atrasos.
-   Acompanhar execução.
-   Consolidar a agenda operacional.

------------------------------------------------------------------------

# Fora do Escopo

Não pertence ao módulo Operações:

-   Conversas em tempo real.
-   Cadastro de clientes.
-   Pipeline comercial.
-   Configuração da plataforma.
-   Indicadores analíticos detalhados.

------------------------------------------------------------------------

# Estrutura Funcional

``` text
Operações
    ├── Hoje
    ├── Atrasados
    ├── Próximos
    ├── Concluídos
    ├── Agenda
    └── Alertas
```

------------------------------------------------------------------------

# Fluxo Operacional

``` text
Compromisso criado
        ↓
Entra na agenda
        ↓
Priorização
        ↓
Execução
        ↓
Concluir
      ou
Reagendar
```

------------------------------------------------------------------------

# Regras de Negócio

-   Toda ação futura pertence ao módulo Operações.
-   Um compromisso permanece visível até ser concluído ou cancelado.
-   Itens vencidos devem ser destacados automaticamente.
-   O histórico de execução deve ser preservado.
-   Operações consolida atividades originadas em Atendimento e
    Comercial.

------------------------------------------------------------------------

# Estados

-   Agendado
-   Em andamento
-   Atrasado
-   Concluído
-   Reagendado
-   Cancelado

------------------------------------------------------------------------

# Permissões

## Atendente

-   Visualizar próprias operações.
-   Concluir.
-   Reagendar quando permitido.

## Supervisor

-   Visualizar equipe.
-   Redistribuir responsáveis.
-   Repriorizar.

## Administrador

-   Gestão completa.

------------------------------------------------------------------------

# Integrações

Recebe informações de:

-   Atendimento
-   Workspace
-   Comercial

Fornece informações para:

-   Analytics
-   Dashboard Operacional

------------------------------------------------------------------------

# KPIs

-   Compromissos do dia.
-   Pendências vencidas.
-   Taxa de conclusão.
-   Tempo médio de execução.
-   Retornos realizados no prazo.

------------------------------------------------------------------------

# Critérios de Aceite

-   O usuário visualiza claramente as prioridades do dia.
-   Operações atrasadas são destacadas.
-   É possível concluir ou reagendar uma atividade.
-   Toda ação possui responsável.
-   O histórico permanece disponível.

------------------------------------------------------------------------

# Evolução Futura

-   Agenda compartilhada.
-   SLA por tipo de operação.
-   Priorização automática por IA.
-   Balanceamento de carga.
-   Regras de automação.
