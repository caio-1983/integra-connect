# UI-008 --- Dashboard Oficial do Integra Connect

## Objetivo

Definir o padrão visual e funcional do Dashboard (Operações), a primeira
tela acessada pelos usuários após o login.

O Dashboard deve responder rapidamente:

-   O que precisa de atenção?
-   O que aconteceu hoje?
-   O que está atrasado?
-   Como está a operação?

------------------------------------------------------------------------

# Princípios

-   Informação antes de gráficos.
-   Prioridade visual clara.
-   Foco em ação.
-   Baixa carga cognitiva.
-   Atualização em tempo real quando disponível.

------------------------------------------------------------------------

# Estrutura

``` text
Breadcrumbs

Título
Descrição

KPIs

Ações Imediatas

Alertas

Resumo Operacional

Gráficos (opcional)

Listas prioritárias
```

------------------------------------------------------------------------

# Componentes

-   PageHeader
-   KPIGrid
-   KPICard
-   ActionCard
-   AlertCard
-   DashboardSection
-   ActivityList
-   EmptyState

------------------------------------------------------------------------

# Hierarquia

1.  KPIs
2.  Ações imediatas
3.  Alertas
4.  Resumo operacional
5.  Indicadores históricos

------------------------------------------------------------------------

# KPIs

Cada KPI deve conter:

-   Título
-   Valor principal
-   Tendência (opcional)
-   Ícone
-   Link para detalhe

Máximo recomendado: 4 por linha.

------------------------------------------------------------------------

# Action Cards

Destinam-se a atividades que exigem ação do usuário.

Exemplos:

-   Conversas aguardando.
-   Compromissos vencidos.
-   Oportunidades sem atualização.

Sempre apresentar CTA claro.

------------------------------------------------------------------------

# Alertas

Exibir somente eventos relevantes.

Evitar excesso de notificações.

Utilizar severidades:

-   Informação
-   Atenção
-   Crítico

------------------------------------------------------------------------

# Layout

Desktop: - Grid de 12 colunas.

Tablet: - Grid adaptável.

Mobile: - Coluna única.

------------------------------------------------------------------------

# Tipografia

Título: - 28px - SemiBold

Descrição: - 14px

KPI: - Valor: 32px - Rótulo: 13px

------------------------------------------------------------------------

# Espaçamentos

-   Entre seções: 24px
-   Entre cards: 16px
-   Padding dos cards: 20px

------------------------------------------------------------------------

# Responsividade

Manter leitura confortável em todos os dispositivos.

Priorizar KPIs e Ações Imediatas em telas menores.

------------------------------------------------------------------------

# Critérios de Aceite

-   Dashboard utiliza App Layout oficial.
-   KPIs seguem UI-004.
-   Cabeçalho segue UI-003.
-   Nenhum componente paralelo.
-   Zero alteração funcional.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   Regras de negócio
-   APIs
-   Rotas
-   Estado global
-   Autenticação

Apenas padronizar a interface.

------------------------------------------------------------------------

# Entregáveis

-   Dashboard padronizado.
-   Componentes reutilizáveis.
-   Migração gradual.
-   Zero regressões.
