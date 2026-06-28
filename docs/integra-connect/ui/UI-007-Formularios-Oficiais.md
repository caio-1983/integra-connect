# UI-007 --- Formulários Oficiais do Integra Connect

## Objetivo

Definir o padrão visual e funcional para formulários do Integra Connect,
garantindo consistência, rapidez no preenchimento e baixa carga
cognitiva.

------------------------------------------------------------------------

# Princípios

-   Simplicidade acima de quantidade.
-   Um fluxo lógico de preenchimento.
-   Validação clara.
-   Feedback imediato.
-   Acessibilidade.

------------------------------------------------------------------------

# Estrutura

``` text
Título

Descrição

--------------------------------

Seção 1

Campo
Campo
Campo

--------------------------------

Seção 2

Campo
Campo

--------------------------------

Ações

Cancelar        Salvar
```

------------------------------------------------------------------------

# Componentes

-   FormContainer
-   FormSection
-   FormField
-   Label
-   HelperText
-   ValidationMessage
-   ButtonGroup

------------------------------------------------------------------------

# Campos

Suportados:

-   Texto
-   Número
-   Data
-   Hora
-   Select
-   MultiSelect
-   Checkbox
-   Switch
-   Radio
-   Upload
-   TextArea

------------------------------------------------------------------------

# Regras

-   Labels sempre acima dos campos.
-   Campos obrigatórios claramente identificados.
-   Helper text apenas quando necessário.
-   Validação próxima ao campo.
-   Evitar mais de duas colunas em formulários complexos.

------------------------------------------------------------------------

# Tipografia

Label: - 13px - Medium

Valor: - 14px

Erro: - 12px - Cor de erro

------------------------------------------------------------------------

# Espaçamentos

-   Campo → Campo: 16px
-   Label → Campo: 8px
-   Seção → Seção: 32px
-   Formulário → Botões: 32px

------------------------------------------------------------------------

# Estados

-   Padrão
-   Foco
-   Preenchido
-   Erro
-   Desabilitado
-   Somente leitura

------------------------------------------------------------------------

# Botões

Primário: - Salvar - Confirmar - Criar

Secundário: - Cancelar - Voltar

Perigosos: - Excluir

------------------------------------------------------------------------

# Responsividade

Desktop: - Até duas colunas.

Tablet: - Uma ou duas colunas.

Mobile: - Coluna única.

------------------------------------------------------------------------

# Critérios de Aceite

-   Todos os formulários reutilizam os mesmos componentes.
-   Validações consistentes.
-   Navegação por teclado preservada.
-   Zero alteração funcional.

------------------------------------------------------------------------

# Restrições

Não alterar:

-   regras de negócio
-   APIs
-   rotas
-   autenticação
-   estado global

Apenas padronizar a experiência visual.

------------------------------------------------------------------------

# Entregáveis

-   Biblioteca reutilizável de formulários.
-   Migração gradual das telas.
-   Zero regressões.
