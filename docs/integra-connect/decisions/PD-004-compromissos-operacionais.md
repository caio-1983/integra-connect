# PD-004 --- Compromissos Operacionais

## Status

Aprovado

------------------------------------------------------------------------

## Data

2026-06-27

------------------------------------------------------------------------

# Problema

Durante o atendimento, clientes frequentemente solicitam um retorno
futuro:

-   "Me liga na sexta."
-   "Vou conversar com meu sócio."
-   "Manda novamente na próxima semana."

Na maioria das empresas esses compromissos ficam registrados apenas na
conversa ou na memória do atendente, ocasionando perda de oportunidades.

------------------------------------------------------------------------

# Contexto

Em reuniões com clientes da Integra Solutions foi identificado que o
esquecimento de retornos representa uma das principais causas de perda
de vendas e queda na qualidade do atendimento.

O Integra Connect deve transformar qualquer promessa de retorno em uma
atividade operacional rastreável.

------------------------------------------------------------------------

# Decisão

Todo atendimento poderá gerar um Compromisso Operacional.

Compromissos passam a ser entidades próprias do domínio Operações,
independentes da conversa.

Eles permanecem ativos até serem:

-   concluídos;
-   reagendados;
-   cancelados.

------------------------------------------------------------------------

# Objetivos

-   Eliminar dependência da memória.
-   Garantir retornos no prazo.
-   Dar previsibilidade à operação.
-   Aumentar conversão de oportunidades.
-   Criar histórico de execução.

------------------------------------------------------------------------

# Estados

-   Agendado
-   Ativo
-   Atrasado
-   Realizado
-   Reagendado
-   Cancelado

------------------------------------------------------------------------

# Regras Permanentes

-   Todo compromisso possui responsável.
-   Todo compromisso possui data prevista.
-   Um compromisso deve permanecer visível até seu encerramento.
-   Reagendamentos preservam histórico.
-   O encerramento deve registrar data e responsável.

------------------------------------------------------------------------

# Consequências

## Positivas

-   Redução da perda de oportunidades.
-   Maior organização operacional.
-   Melhor acompanhamento pelos gestores.
-   Histórico auditável.

## Negativas

-   Exige disciplina da equipe na manutenção dos compromissos.

------------------------------------------------------------------------

# Impacto

Influencia diretamente:

-   Operações
-   Workspace
-   Comercial
-   Analytics

------------------------------------------------------------------------

# Relacionamentos

-   PD-003 --- Operações como Centro da Gestão Diária
-   Architecture/03-workspace.md
-   Architecture/05-fluxos.md
-   SPEC Compromissos

------------------------------------------------------------------------

# Regra Permanente

Nenhum retorno solicitado por um cliente deverá depender exclusivamente
da memória de um colaborador.

Sempre que existir uma ação futura, deverá existir um Compromisso
Operacional correspondente.
