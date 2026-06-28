# UI-006 --- Tabelas Oficiais do Integra Connect

## Objetivo

Definir o padrão visual e funcional para todas as tabelas utilizadas no
Integra Connect.

As tabelas devem privilegiar legibilidade, produtividade e velocidade
operacional.

------------------------------------------------------------------------

# Princípios

-   A informação é prioridade.
-   Baixa carga visual.
-   Consistência entre módulos.
-   Ações rápidas sem poluição visual.

------------------------------------------------------------------------

# Estrutura

``` text
┌────────────────────────────────────────────────────────────┐
│ Toolbar                                                    │
│ Busca | Filtros | Exportar | Novo                          │
├────────────────────────────────────────────────────────────┤
│ Cabeçalho da tabela                                        │
├────────────────────────────────────────────────────────────┤
│ Linha                                                      │
│ Linha                                                      │
│ Linha                                                      │
├────────────────────────────────────────────────────────────┤
│ Paginação                                                  │
└────────────────────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# Componentes

-   DataTable
-   TableHeader
-   TableToolbar
-   TableRow
-   TableCell
-   EmptyState
-   Pagination

------------------------------------------------------------------------

# Cabeçalho

-   Fundo neutro.
-   Texto SemiBold.
-   Ordenação quando aplicável.
-   Indicador visual de coluna ordenada.

------------------------------------------------------------------------

# Linhas

-   Altura mínima: 52px
-   Hover discreto (#F8FAFC)
-   Linha selecionada com cor institucional.
-   Ações rápidas apenas ao passar o mouse (quando fizer sentido).

------------------------------------------------------------------------

# Toolbar

Pode conter:

-   Busca
-   Filtros
-   Exportação
-   Botão principal
-   Contador de registros

Sempre acima da tabela.

------------------------------------------------------------------------

# Estados

-   Carregando
-   Sem resultados
-   Erro
-   Seleção múltipla
-   Paginação

------------------------------------------------------------------------

# Tipografia

Cabeçalho: - 13px - SemiBold

Conteúdo: - 14px

Texto auxiliar: - 12px

------------------------------------------------------------------------

# Espaçamentos

-   Padding interno das células: 16px
-   Gap entre toolbar e tabela: 16px

------------------------------------------------------------------------

# Responsividade

Desktop: - Tabela completa.

Tablet: - Ocultar colunas secundárias.

Mobile: - Transformar linhas em cards.

------------------------------------------------------------------------

# Regras

-   Não utilizar linhas excessivamente densas.
-   Evitar excesso de colunas.
-   Priorizar informações realmente úteis.
-   Manter alinhamento consistente.

------------------------------------------------------------------------

# Critérios de Aceite

-   Todas as tabelas reutilizam o mesmo componente.
-   Toolbar padronizada.
-   Estados consistentes.
-   Zero alteração funcional.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   regras de negócio
-   APIs
-   rotas
-   estado global

Apenas padronizar a experiência visual.

------------------------------------------------------------------------

# Entregáveis

-   Componentes reutilizáveis de tabela.
-   Migração gradual.
-   Zero regressões.
