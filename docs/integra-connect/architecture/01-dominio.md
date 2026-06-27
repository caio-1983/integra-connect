# 01 - Domínio

# Domínio do Produto

## Objetivo

Este documento define os domínios de negócio do Integra Connect.

Seu propósito é garantir que funcionalidades sejam organizadas conforme
o problema que resolvem, e não conforme a tecnologia utilizada.

------------------------------------------------------------------------

# Conceito Central

O Integra Connect organiza o relacionamento entre empresas e pessoas.

Todo o restante da plataforma existe para apoiar esse relacionamento.

------------------------------------------------------------------------

# Entidades Conceituais

## Pessoa

Representa qualquer indivíduo que interage com a empresa.

Uma pessoa pode possuir diversos canais de comunicação.

Exemplos:

-   WhatsApp
-   Instagram
-   Facebook
-   Telegram
-   E-mail

------------------------------------------------------------------------

## Conversa

Representa uma interação em tempo real.

Características:

-   possui mensagens;
-   possui responsável;
-   possui contexto;
-   acontece em um canal.

A conversa existe apenas durante a operação.

------------------------------------------------------------------------

## Workspace

Representa o ambiente operacional do atendimento.

Seu objetivo é permitir que a equipe execute ações durante a conversa.

O Workspace responde:

"O que preciso fazer agora?"

------------------------------------------------------------------------

## Cliente

Representa o relacionamento permanente da empresa com uma pessoa.

O cliente existe independentemente de haver uma conversa ativa.

Inclui:

-   histórico;
-   perfil;
-   segmentação;
-   informações cadastrais;
-   linha do tempo.

O módulo Clientes responde:

"Quem é esta pessoa para a empresa?"

------------------------------------------------------------------------

## Compromisso

Representa uma ação futura decorrente de um atendimento.

Exemplos:

-   retornar ligação;
-   enviar orçamento;
-   confirmar visita;
-   acompanhar negociação.

Compromissos pertencem ao domínio Operações.

------------------------------------------------------------------------

## Oportunidade

Representa uma possibilidade comercial.

Ela pode nascer durante uma conversa, mas pertence ao domínio Comercial.

------------------------------------------------------------------------

# Separação de Responsabilidades

Workspace → operação em tempo real.

Clientes → relacionamento permanente.

Operações → ações futuras.

Comercial → ciclo de vendas.

Analytics → indicadores.

Administração → configuração da plataforma.

------------------------------------------------------------------------

# Fonte Única de Verdade

Cada informação possui um único módulo responsável.

Exemplos:

Telefone → Clientes

Resumo do atendimento → Workspace

Compromissos → Operações

Oportunidades → Comercial

Indicadores → Analytics

------------------------------------------------------------------------

# Regras Permanentes

Uma funcionalidade nunca deve ser criada antes da definição do domínio
ao qual pertence.

Essa separação reduz duplicidade, facilita evolução e preserva a
arquitetura do produto.
