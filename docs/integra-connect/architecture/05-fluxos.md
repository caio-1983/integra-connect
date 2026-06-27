# 05 - Fluxos

# Fluxos Operacionais

## Objetivo

Documentar os principais fluxos de negócio do Integra Connect.

Os fluxos descrevem a jornada operacional do usuário e servem como
referência para Produto, UX e Engenharia.

------------------------------------------------------------------------

# Fluxo 1 --- Atendimento

``` text
Nova conversa
      ↓
Fila de atendimento
      ↓
Workspace
      ↓
Resposta ao cliente
      ↓
Registrar ação (opcional)
      ↓
Encerrar atendimento
```

Resultado esperado: - Conversa resolvida. - Contexto preservado. -
Próximas ações registradas quando necessário.

------------------------------------------------------------------------

# Fluxo 2 --- Compromissos

``` text
Conversa
      ↓
Criar compromisso
      ↓
Definir responsável
      ↓
Definir data
      ↓
Agenda operacional
      ↓
Lembrete
      ↓
Execução
      ↓
Concluir ou reagendar
```

Objetivo: Garantir que nenhum retorno seja esquecido.

------------------------------------------------------------------------

# Fluxo 3 --- Comercial

``` text
Conversa
      ↓
Criar oportunidade
      ↓
Pipeline
      ↓
Negociação
      ↓
Proposta
      ↓
Fechamento
```

O ciclo comercial nasce no atendimento, mas pertence ao módulo
Comercial.

------------------------------------------------------------------------

# Fluxo 4 --- Clientes

``` text
Primeiro contato
      ↓
Identificação
      ↓
Cadastro
      ↓
Histórico
      ↓
Relacionamento contínuo
```

O módulo Clientes consolida informações permanentes.

------------------------------------------------------------------------

# Fluxo 5 --- Operações

``` text
Compromissos
Pendências
Alertas
Retornos
        ↓
Tela Operações
        ↓
Priorizar
        ↓
Executar
```

Operações concentra tudo o que exige ação da equipe.

------------------------------------------------------------------------

# Fluxo entre Módulos

``` text
Atendimento
     │
     ├── cria Compromisso → Operações
     ├── cria Oportunidade → Comercial
     └── consulta Cliente → Clientes

Todos os módulos alimentam → Analytics
```

------------------------------------------------------------------------

# Princípios

-   Cada fluxo possui início, meio e fim.
-   Um fluxo nunca duplica responsabilidades de outro.
-   O usuário sempre sabe qual é o próximo passo.
-   Toda ação relevante gera rastreabilidade.

------------------------------------------------------------------------

# Regra Permanente

Antes de implementar uma funcionalidade, ela deve ser posicionada em um
fluxo existente.

Se nenhum fluxo representar corretamente a funcionalidade, um novo fluxo
deverá ser definido e documentado antes da implementação.
