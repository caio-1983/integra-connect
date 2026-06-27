# Dashboard

Versão 1.0

---

# Objetivo

O Dashboard é o Centro de Operações do Integra Connect.

Ele não existe para mostrar gráficos.

Ele existe para que um gestor compreenda a situação da operação em poucos segundos.

O usuário deve conseguir responder rapidamente:

• Como está minha operação?

• Existe alguma pendência?

• Qual equipe precisa de atenção?

• Existem canais desconectados?

• O que devo fazer agora?

---

# Missão da Tela

Fornecer uma visão executiva e operacional da empresa.

Toda informação apresentada deve auxiliar na tomada de decisão.

---

# Público

• Proprietários

• Gestores

• Supervisores

• Coordenadores

• Líderes de equipe

---

# Objetivos da Experiência

Ao abrir o Dashboard o usuário deverá sentir:

Organização.

Controle.

Segurança.

Rapidez.

Produtividade.

Nunca deverá sentir que está entrando em uma tela de configurações.

---

# Problemas do Dashboard Atual

O Dashboard atual apresenta diversos problemas de experiência.

Entre eles:

• excesso de foco em configuração

• onboarding ocupa grande espaço

• linguagem voltada para IA

• KPIs genéricos

• pouca percepção operacional

• ausência de prioridades

• ausência de contexto

Esses problemas deverão ser corrigidos gradualmente.

---

# Conceito

O Dashboard será tratado como Centro de Operações.

Toda informação deverá responder:

Como está a empresa neste momento?

---

# Hierarquia

A tela deverá seguir obrigatoriamente esta ordem.

1.

Cabeçalho

↓

2.

Saúde da Operação

↓

3.

KPIs

↓

4.

Atividades

↓

5.

Alertas

↓

6.

Insights

↓

7.

Ações rápidas

---

# Cabeçalho

O cabeçalho deverá apresentar:

Empresa

Unidade

Período

Última atualização

Nunca utilizar cabeçalhos genéricos.

---

# Saúde da Operação

Deverá apresentar rapidamente:

Canais conectados

Operadores online

Integrações

Status geral

Nunca utilizar grandes alertas vermelhos sem necessidade.

---

# KPIs

KPIs deverão responder perguntas.

Exemplos:

Conversas aguardando

Conversas em andamento

Tempo médio

SLA

Canais ativos

Automações executadas

Atendimentos finalizados

Nunca utilizar KPIs apenas decorativos.

---

# Atividades

Apresentar acontecimentos recentes.

Exemplos:

Novos contatos.

Novos atendimentos.

Transferências.

Integrações.

Automações.

---

# Alertas

Exibir apenas problemas relevantes.

Exemplos:

Canal desconectado.

Fila acumulada.

Falha de integração.

Nunca utilizar alertas para onboarding.

---

# Insights

Área destinada à Inteligência Artificial.

Exemplos:

Maior volume de contatos.

Mudança de comportamento.

Sugestões.

A IA nunca deverá dominar o Dashboard.

---

# Ações Rápidas

Permitir acesso rápido às ações mais utilizadas.

Exemplos:

Novo Canal

Nova Automação

Novo Usuário

Novo Contato

---

# Critérios de UX

O Dashboard deve ser compreendido em menos de 30 segundos.

Nenhum card deve competir pela atenção.

A prioridade deve ser sempre operacional.

---

# Componentes Envolvidos

Dashboard.tsx

SystemHealthCard.tsx

OnboardingBanner.tsx

Sidebar.tsx

---

# Critérios de Aceite

A tela transmite organização.

A tela transmite controle.

A tela transmite simplicidade.

O usuário identifica rapidamente a situação da empresa.

A IA aparece apenas como apoio.

O Dashboard deixa de parecer um painel administrativo.

---

# Evoluções Futuras

Adicionar:

Resumo Executivo

Agenda

Indicadores financeiros

Performance da Equipe

Performance dos Canais

Performance das Automações

Analytics

CRM

Todas essas evoluções deverão respeitar esta especificação.

