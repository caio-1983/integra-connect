# 06 - SPEC Comercial

## Status

Aprovada

------------------------------------------------------------------------

# Objetivo

Definir o comportamento funcional do módulo **Comercial**, responsável
por transformar atendimentos em oportunidades de negócio e acompanhar
todo o ciclo de vendas até sua conclusão.

O módulo Comercial organiza negociações sem interferir na operação do
atendimento.

------------------------------------------------------------------------

# Problema de Negócio

Em muitas empresas, oportunidades comerciais ficam dispersas em
conversas, anotações e planilhas, dificultando previsibilidade,
acompanhamento e gestão do funil de vendas.

------------------------------------------------------------------------

# Responsabilidade

O módulo Comercial é responsável por:

-   Registrar oportunidades.
-   Gerenciar o pipeline de vendas.
-   Acompanhar negociações.
-   Registrar propostas.
-   Controlar ganhos e perdas.
-   Apoiar previsões comerciais.

------------------------------------------------------------------------

# Fora do Escopo

Não pertence ao módulo Comercial:

-   Conversas em tempo real.
-   Cadastro permanente de clientes.
-   Agenda operacional.
-   Configurações da plataforma.
-   Indicadores analíticos consolidados.

------------------------------------------------------------------------

# Estrutura Funcional

``` text
Comercial
    ├── Pipeline
    ├── Oportunidades
    ├── Propostas
    ├── Negociações
    ├── Ganhos
    └── Perdidos
```

------------------------------------------------------------------------

# Fluxo Operacional

``` text
Atendimento
      ↓
Criar oportunidade
      ↓
Selecionar etapa do pipeline
      ↓
Negociação
      ↓
Proposta
      ↓
Ganho
   ou
Perdido
```

------------------------------------------------------------------------

# Regras de Negócio

-   Toda oportunidade possui um cliente.
-   Toda oportunidade possui um responsável.
-   A oportunidade possui uma etapa atual do pipeline.
-   Mudanças de etapa devem ficar registradas no histórico.
-   Oportunidades podem gerar compromissos operacionais.
-   O encerramento registra o motivo de ganho ou perda.

------------------------------------------------------------------------

# Estados

-   Nova
-   Em qualificação
-   Em negociação
-   Proposta enviada
-   Ganha
-   Perdida

------------------------------------------------------------------------

# Permissões

## Atendente

-   Criar oportunidade.
-   Consultar oportunidades próprias.

## Supervisor

-   Visualizar equipe.
-   Alterar responsável.
-   Atualizar pipeline.

## Administrador

-   Gestão completa.

------------------------------------------------------------------------

# Integrações

Recebe informações de:

-   Atendimento
-   Workspace
-   Clientes

Envia informações para:

-   Operações
-   Analytics

------------------------------------------------------------------------

# KPIs

-   Oportunidades criadas.
-   Taxa de conversão.
-   Valor em negociação.
-   Valor ganho.
-   Valor perdido.
-   Tempo médio de fechamento.

------------------------------------------------------------------------

# Critérios de Aceite

-   O usuário cria uma oportunidade durante o atendimento.
-   A oportunidade aparece imediatamente no pipeline.
-   Mudanças de etapa preservam histórico.
-   Oportunidades podem gerar compromissos.
-   Ganhos e perdas ficam registrados.

------------------------------------------------------------------------

# Evolução Futura

-   Múltiplos pipelines.
-   Forecast de vendas.
-   Probabilidade automática por IA.
-   Integração com ERP.
-   Metas comerciais.
-   Comissões.
