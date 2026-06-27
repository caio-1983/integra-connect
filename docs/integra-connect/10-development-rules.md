# Integra Connect

# Regras Oficiais de Desenvolvimento

Versão 1.0

Este documento define como toda implementação deve ser realizada.

Estas regras são obrigatórias para qualquer Inteligência Artificial ou desenvolvedor que trabalhe neste projeto.

---

# Filosofia

O objetivo é evoluir continuamente um produto existente.

Não estamos reescrevendo um sistema.

Estamos transformando uma plataforma em um produto SaaS proprietário.

Toda alteração deve gerar valor.

Toda alteração deve possuir escopo pequeno.

---

# Regra Nº 1

Leia primeiro:

99-ai-context.md

Antes de qualquer implementação.

---

# Regra Nº 2

Leia somente os arquivos indicados no prompt.

Nunca explore o projeto inteiro.

Nunca faça buscas desnecessárias.

Caso o arquivo necessário não esteja listado.

Informe ao usuário.

---

# Regra Nº 3

Nunca modificar arquivos fora do escopo.

Mesmo que encontre oportunidades de melhoria.

Apenas relate.

Não implemente.

---

# Regra Nº 4

Preservar arquitetura existente.

Não mover arquivos.

Não reorganizar pastas.

Não renomear componentes.

Não alterar estrutura sem autorização explícita.

---

# Regra Nº 5

Sempre reutilizar componentes.

Antes de criar qualquer componente verificar:

Já existe?

Pode ser parametrizado?

Pode ser reutilizado?

Criar novo componente apenas quando realmente necessário.

---

# Regra Nº 6

Nunca duplicar código.

Sempre reutilizar lógica existente.

---

# Regra Nº 7

Nunca alterar backend quando a demanda for visual.

---

# Regra Nº 8

Nunca alterar banco de dados quando a demanda for UX.

---

# Regra Nº 9

Nunca alterar APIs quando a alteração for apenas de interface.

---

# Regra Nº 10

Evitar novas dependências.

Antes de instalar qualquer biblioteca verificar se o projeto já possui solução equivalente.

---

# React

Preferir componentes pequenos.

Uma responsabilidade por componente.

Evitar arquivos gigantes.

---

# Hooks

Nunca colocar regras de negócio dentro da interface.

Sempre utilizar Hooks quando necessário.

---

# Tailwind

Reutilizar classes existentes.

Evitar estilos inline.

Evitar CSS duplicado.

Seguir Design System.

---

# Performance

Evitar renderizações desnecessárias.

Evitar estados duplicados.

Evitar consultas repetidas.

---

# Código

Priorizar:

Legibilidade.

Organização.

Simplicidade.

Facilidade de manutenção.

---

# Antes de finalizar

Revisar:

Existe código duplicado?

Existe componente reutilizável?

Existe alteração fora do escopo?

Estou respeitando UX?

Estou respeitando Branding?

Estou respeitando Design System?

---

# Entrega

Ao concluir informar obrigatoriamente:

Arquivos alterados.

Componentes reutilizados.

Novos componentes.

Possíveis impactos.

Pendências encontradas.

Nunca finalizar apenas dizendo "concluído".

