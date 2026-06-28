# 02 - SPEC Workspace

## Status

Aprovada

------------------------------------------------------------------------

# Objetivo

Definir o comportamento funcional do Workspace, o principal ambiente
operacional do Integra Connect.

O Workspace concentra tudo o que o atendente precisa durante uma
conversa, reduzindo troca de telas e fornecendo contexto para tomada de
decisão.

------------------------------------------------------------------------

# Problema de Negócio

Durante um atendimento, operadores alternam entre múltiplas telas para
consultar clientes, registrar informações e executar ações.

Essa fragmentação reduz produtividade, aumenta erros e provoca perda de
contexto.

O Workspace elimina essa fragmentação.

------------------------------------------------------------------------

# Responsabilidade

O Workspace é responsável por:

-   Exibir a conversa ativa.
-   Exibir contexto do cliente.
-   Disponibilizar ações operacionais.
-   Permitir criação de compromissos.
-   Permitir criação de oportunidades.
-   Exibir histórico resumido.
-   Integrar informações de outros módulos.

------------------------------------------------------------------------

# Fora do Escopo

Não pertence ao Workspace:

-   Cadastro completo do cliente.
-   Gestão do pipeline comercial.
-   Configuração do sistema.
-   Dashboards gerenciais.
-   Administração de usuários.

------------------------------------------------------------------------

# Estrutura Funcional

``` text
Sidebar
    ↓
Lista de Conversas
    ↓
Workspace
    ├── Cabeçalho
    ├── Conversa
    ├── Campo de Resposta
    ├── Barra de Ações
    └── Painel do Cliente
            ├── Contato
            ├── Compromissos
            ├── Comercial
            └── Histórico
```

------------------------------------------------------------------------

# Fluxo Operacional

``` text
Selecionar conversa
        ↓
Carregar Workspace
        ↓
Visualizar contexto
        ↓
Responder cliente
        ↓
Executar ações (opcional)
        ↓
Encerrar atendimento
```

------------------------------------------------------------------------

# Regras de Negócio

-   Apenas uma conversa ativa por Workspace.
-   O histórico da conversa permanece íntegro.
-   O painel lateral reflete o cliente da conversa ativa.
-   O Workspace pode consultar dados de outros módulos, mas não altera
    sua fonte oficial.
-   A criação de compromissos e oportunidades deve ocorrer sem
    interromper o atendimento.

------------------------------------------------------------------------

# Componentes

## Cabeçalho

-   Nome do cliente
-   Canal
-   Responsável
-   Status

## Conversa

-   Mensagens
-   Áudios
-   Imagens
-   Documentos

## Barra de Ações

-   Novo compromisso
-   Nova oportunidade
-   Transferir
-   Etiquetas
-   Resumir conversa
-   Encerrar atendimento

## Painel do Cliente

### Contato

Resumo operacional.

### Compromissos

Ações futuras.

### Comercial

Oportunidades relacionadas.

### Histórico

Linha do tempo consolidada.

------------------------------------------------------------------------

# Estados

-   Sem conversa selecionada
-   Conversa ativa
-   Carregando
-   Atendimento encerrado

------------------------------------------------------------------------

# Permissões

## Atendente

-   Operar Workspace
-   Criar compromissos
-   Criar oportunidades

## Supervisor

-   Todas as permissões do atendente
-   Transferir atendimentos
-   Alterar responsável

## Administrador

-   Acesso completo

------------------------------------------------------------------------

# Integrações

Consome informações de:

-   Atendimento
-   Clientes
-   Operações
-   Comercial

Produz informações para:

-   Analytics

------------------------------------------------------------------------

# KPIs

-   Tempo médio por atendimento
-   Compromissos gerados
-   Oportunidades geradas
-   Tempo de resposta
-   Conversões originadas do Workspace

------------------------------------------------------------------------

# Critérios de Aceite

-   O usuário consegue responder mensagens sem trocar de tela.
-   O painel contextual muda conforme a conversa ativa.
-   É possível criar compromissos durante o atendimento.
-   É possível criar oportunidades durante o atendimento.
-   O Workspace preserva contexto e histórico.

------------------------------------------------------------------------

# Evolução Futura

-   Copiloto de IA.
-   Sugestões automáticas.
-   Múltiplos painéis especializados.
-   Colaboração em tempo real.
-   Automação contextual.
