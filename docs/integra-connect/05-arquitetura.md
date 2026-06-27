# Integra Connect

# Arquitetura de Desenvolvimento

Versão 1.0

---

# Objetivo

Este documento define as regras obrigatórias para evolução do código do Integra Connect.

Toda implementação deve priorizar evolução incremental.

Nunca grandes refatorações.

---

# Filosofia

A plataforma possui uma base funcional.

O objetivo NÃO é reescrever o sistema.

O objetivo é evoluir continuamente.

Cada alteração deve gerar valor sem aumentar complexidade.

---

# Regra Nº 1

Sempre preservar a arquitetura existente.

Evitar grandes mudanças estruturais.

---

# Regra Nº 2

Nunca criar código duplicado.

Sempre procurar reutilizar componentes existentes.

---

# Regra Nº 3

Caso exista componente semelhante.

Evoluir o componente.

Não criar outro.

---

# Regra Nº 4

Toda alteração deve possuir escopo pequeno.

Evitar Pull Requests gigantes.

Evitar grandes commits.

---

# Regra Nº 5

Nunca alterar backend quando a demanda for apenas visual.

---

# Regra Nº 6

Nunca alterar banco de dados quando a alteração for apenas de UX.

---

# Regra Nº 7

Nunca alterar APIs sem necessidade.

---

# Organização

Sempre manter separação entre:

UI

Lógica

Serviços

Hooks

Integrações

---

# Componentes

Sempre reutilizar componentes.

Antes de criar um novo componente verificar:

Existe algo parecido?

Posso parametrizar?

Posso reutilizar?

---

# Hooks

Nunca colocar regras de negócio dentro dos componentes.

Sempre utilizar Hooks quando necessário.

---

# Performance

Evitar renderizações desnecessárias.

Evitar estados duplicados.

Evitar consultas repetidas.

Evitar componentes gigantes.

---

# Responsabilidade

Cada componente deve possuir apenas uma responsabilidade.

Nunca criar componentes que fazem dezenas de tarefas diferentes.

---

# Código

Preferir código simples.

Preferir legibilidade.

Evitar complexidade desnecessária.

---

# Dependências

Evitar instalar novas bibliotecas.

Sempre utilizar recursos existentes quando possível.

---

# Tailwind

Sempre reutilizar classes existentes.

Evitar estilos inline.

Evitar CSS duplicado.

---

# Design System

Toda alteração visual deve seguir obrigatoriamente:

04-design-system.md

---

# UX

Toda alteração deve seguir obrigatoriamente:

03-ux.md

---

# Branding

Toda alteração deve seguir obrigatoriamente:

02-branding.md

---

# Processo

Toda implementação seguirá:

Análise

↓

Aprovação

↓

Prompt

↓

Implementação

↓

Validação

↓

Registro da decisão

Nunca implementar funcionalidades diretamente sem análise.

---

# Regra Final

O objetivo não é modificar código.

O objetivo é melhorar o produto preservando estabilidade.

