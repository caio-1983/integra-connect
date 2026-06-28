# 05 - SPEC Compromissos Operacionais

## Status

Aprovada

------------------------------------------------------------------------

# Objetivo

Definir o comportamento funcional da entidade **Compromisso
Operacional**, responsável por garantir que toda ação futura gerada
durante o relacionamento com um cliente seja registrada, acompanhada e
concluída.

O compromisso é a principal entidade operacional do Integra Connect.

------------------------------------------------------------------------

# Problema de Negócio

Em operações comerciais e de atendimento, promessas como "retornar
amanhã", "enviar orçamento" ou "ligar na próxima semana" frequentemente
são esquecidas.

Esses esquecimentos geram perda de vendas, insatisfação dos clientes e
falta de controle da operação.

------------------------------------------------------------------------

# Responsabilidade

Um Compromisso Operacional é responsável por representar qualquer ação
futura que exija acompanhamento.

Exemplos:

-   Retornar ligação.
-   Enviar proposta.
-   Confirmar visita.
-   Solicitar documentos.
-   Fazer follow-up.
-   Confirmar pagamento.

------------------------------------------------------------------------

# Fora do Escopo

Não pertence ao compromisso:

-   Mensagens da conversa.
-   Cadastro do cliente.
-   Negociação comercial completa.
-   Configurações do sistema.
-   Indicadores consolidados.

------------------------------------------------------------------------

# Estrutura Funcional

``` text
Compromisso
    ├── Título
    ├── Cliente
    ├── Responsável
    ├── Origem
    ├── Data/Hora
    ├── Prioridade
    ├── Status
    ├── Observações
    └── Histórico
```

------------------------------------------------------------------------

# Fluxo Operacional

``` text
Conversa
      ↓
Criar compromisso
      ↓
Definir responsável
      ↓
Definir data
      ↓
Entrar em Operações
      ↓
Executar
      ↓
Concluir
        ou
Reagendar
```

------------------------------------------------------------------------

# Regras de Negócio

-   Todo compromisso possui responsável.
-   Todo compromisso possui data prevista.
-   Todo compromisso possui origem.
-   O histórico deve registrar todas as alterações.
-   Reagendamentos preservam o histórico.
-   Compromissos concluídos permanecem consultáveis.
-   Um compromisso pode ser criado a partir do Atendimento, Workspace ou
    Comercial.

------------------------------------------------------------------------

# Estados

-   Agendado
-   Em andamento
-   Atrasado
-   Concluído
-   Reagendado
-   Cancelado

Transições inválidas devem ser impedidas pela aplicação.

------------------------------------------------------------------------

# Permissões

## Atendente

-   Criar.
-   Visualizar os próprios.
-   Concluir.
-   Reagendar quando permitido.

## Supervisor

-   Visualizar equipe.
-   Alterar responsável.
-   Repriorizar.
-   Cancelar.

## Administrador

-   Gestão completa.

------------------------------------------------------------------------

# Integrações

Origem:

-   Atendimento
-   Workspace
-   Comercial

Destino:

-   Operações
-   Analytics
-   Histórico do Cliente

------------------------------------------------------------------------

# KPIs

-   Compromissos criados.
-   Compromissos concluídos.
-   Compromissos atrasados.
-   Tempo médio até conclusão.
-   Percentual de cumprimento no prazo.

------------------------------------------------------------------------

# Critérios de Aceite

-   O usuário consegue criar um compromisso durante um atendimento.
-   O compromisso aparece imediatamente em Operações.
-   Alterações ficam registradas no histórico.
-   É possível concluir ou reagendar.
-   Compromissos atrasados são destacados automaticamente.

------------------------------------------------------------------------

# Evolução Futura

-   Recorrência.
-   Dependência entre compromissos.
-   Notificações inteligentes.
-   Priorização por IA.
-   SLA por categoria.
-   Execução em dispositivos móveis.
