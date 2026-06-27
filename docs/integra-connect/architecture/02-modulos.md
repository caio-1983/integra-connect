# 02 - Módulos

# Organização dos Módulos

## Objetivo

Definir a responsabilidade de cada módulo funcional do Integra Connect e
as relações entre eles.

Cada módulo deve resolver um problema específico do negócio e possuir
fronteiras claras.

------------------------------------------------------------------------

# Mapa dos Módulos

``` text
Operações
│
├── Atendimento
├── Clientes
├── Comercial
├── Analytics
└── Administração
```

------------------------------------------------------------------------

# Atendimento

## Responsabilidade

Gerenciar a operação em tempo real.

## Inclui

-   Workspace
-   Conversas
-   Mensagens
-   Resumo do Atendimento
-   Transferências
-   Etiquetas operacionais

## Não pertence

-   Cadastro completo
-   Pipeline comercial
-   Indicadores

------------------------------------------------------------------------

# Clientes

## Responsabilidade

Gerenciar o relacionamento permanente.

## Inclui

-   Cadastro
-   Telefones
-   E-mails
-   Histórico
-   Linha do tempo
-   Segmentação
-   Responsável

## Não pertence

-   Conversas em tempo real
-   Compromissos
-   Oportunidades

------------------------------------------------------------------------

# Operações

## Responsabilidade

Garantir que nenhuma ação seja esquecida.

## Inclui

-   Compromissos
-   Retornos
-   Pendências
-   Alertas
-   Agenda operacional

------------------------------------------------------------------------

# Comercial

## Responsabilidade

Gerenciar o ciclo de vendas.

## Inclui

-   Oportunidades
-   Pipeline
-   Propostas
-   Negociações
-   Fechamentos

------------------------------------------------------------------------

# Analytics

## Responsabilidade

Transformar dados em indicadores.

## Inclui

-   KPIs
-   Dashboards
-   SLA
-   Conversão
-   Produtividade

------------------------------------------------------------------------

# Administração

## Responsabilidade

Configurar e manter a plataforma.

## Inclui

-   Usuários
-   Perfis
-   Permissões
-   Canais
-   Integrações
-   Configurações

------------------------------------------------------------------------

# Relação entre Módulos

Atendimento pode criar:

-   Compromissos
-   Oportunidades

Clientes fornece contexto para:

-   Atendimento
-   Comercial

Operações acompanha ações geradas por:

-   Atendimento
-   Comercial

Analytics consolida informações de todos os módulos.

------------------------------------------------------------------------

# Princípios

-   Baixo acoplamento.
-   Alta coesão.
-   Fonte única de verdade.
-   Reutilização de componentes.
-   Evolução independente dos módulos.

------------------------------------------------------------------------

# Regra Permanente

Nenhum módulo deve assumir responsabilidades de outro.

Quando houver dúvida, priorizar a separação de domínio em vez da
conveniência de implementação.
