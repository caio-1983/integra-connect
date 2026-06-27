# Integra Connect

# Design System

Versão: 1.0

---

# Objetivo

O Design System do Integra Connect define todos os padrões visuais e comportamentais da interface.

Seu objetivo é garantir consistência, escalabilidade e qualidade em toda a plataforma.

Nenhuma tela deverá ser criada sem seguir este documento.

---

# Filosofia

O Design System deve transmitir exatamente os mesmos valores da Integra Solutions.

Organização.

Simplicidade.

Eficiência.

Profissionalismo.

Confiabilidade.

Nunca extravagância.

---

# Aparência Geral

O Integra Connect deve parecer um software corporativo moderno.

Não deve parecer:

• template

• painel administrativo genérico

• chatbot

• plataforma de IA

• dashboard financeiro

O usuário deve sentir que está utilizando um produto premium.

---

# Sistema de Espaçamento

Utilizar sempre múltiplos de 4.

Escala oficial:

4

8

12

16

20

24

32

40

48

64

Nunca utilizar espaçamentos aleatórios.

Todo layout deverá seguir essa escala.

---

# Grid

Todo layout deverá utilizar grid consistente.

Sempre manter alinhamentos.

Evitar elementos desalinhados.

Priorizar leitura.

---

# Containers

Todo conteúdo deverá possuir respiro.

Nunca aproximar conteúdo das bordas.

Preferir áreas amplas.

O branco faz parte da interface.

---

# Layout

Toda página deverá seguir esta estrutura.

Cabeçalho

↓

Indicadores

↓

Conteúdo Principal

↓

Ações

↓

Informações Secundárias

↓

Rodapé (quando necessário)

---

# Sidebar

A Sidebar é um dos elementos mais importantes da identidade do produto.

Objetivos:

orientar

organizar

facilitar navegação

Nunca competir visualmente com o conteúdo.

---

# Sidebar - Estrutura

Logo

Empresa

Pesquisa (futuro)

Menu Principal

Menu Administrativo

Usuário

Nunca misturar funcionalidades operacionais com configurações.

---

# Cabeçalho

O cabeçalho deve responder:

Onde estou?

Qual empresa?

Qual unidade?

Quem está conectado?

Nunca transformar o Header em uma barra cheia de botões.

---

# Tipografia

Hierarquia obrigatória.

H1

Título da página.

H2

Seções.

H3

Cards.

Texto

Conteúdo.

Legenda

Informações secundárias.

Nunca utilizar muitos tamanhos diferentes.

---

# Cards

Os cards são o principal componente do sistema.

Todo card deverá possuir:

Título

Conteúdo

Espaçamento

Hierarquia

Nunca excesso de informação.

---

# KPI Cards

Os KPIs deverão responder perguntas.

Nunca mostrar apenas números.

Cada KPI deve possuir:

Título

Valor

Indicador

Comparação

Estado

Exemplo

Conversas aguardando

12

▲ 8%

Normal

---

# Badges

Badges servem para indicar estados.

Nunca decorar.

Exemplos:

Conectado

Desconectado

Novo

Automático

Manual

Em andamento

Finalizado

Erro

---

# Ícones

Todos os ícones deverão seguir o mesmo estilo.

Preferencialmente lineares.

Nunca misturar bibliotecas.

Nunca utilizar ícones ilustrativos.

---

# Botões

Existem apenas três níveis.

Primário

Secundário

Terciário

Nunca criar novos estilos.

---

# Inputs

Todos os Inputs deverão compartilhar:

altura

borda

tipografia

padding

focus

hover

disabled

Nunca criar exceções.


---

# Tabelas

As tabelas deverão privilegiar produtividade.

Sempre apresentar:

• Pesquisa

• Filtros

• Ordenação

• Paginação

• Ações rápidas

Nunca utilizar excesso de colunas.

O usuário deve conseguir localizar uma informação em poucos segundos.

---

# Pesquisa

A pesquisa deve estar sempre visível quando houver grande volume de informações.

A pesquisa deverá aceitar linguagem natural.

Exemplos:

Nome

Telefone

Empresa

CPF

Etiqueta

E-mail

Nunca exigir formatos específicos.

---

# Filtros

Filtros deverão aparecer apenas quando agregarem valor.

Filtros avançados deverão permanecer recolhidos.

Nunca esconder informações importantes atrás de filtros.

---

# Formulários

Todo formulário deverá ser dividido em grupos lógicos.

Exemplo:

Dados Gerais

↓

Contato

↓

Configurações

↓

Integrações

Nunca apresentar dezenas de campos contínuos.

---

# Validação

Toda validação deverá ocorrer o mais cedo possível.

Sempre explicar:

Qual campo possui erro.

Por que ocorreu.

Como resolver.

Nunca utilizar mensagens genéricas.

---

# Modais

Os modais devem ser utilizados apenas para tarefas rápidas.

Exemplos:

Confirmações

Edição simples

Visualização rápida

Nunca utilizar modais para processos longos.

Quando necessário utilizar páginas completas.

---

# Drawer

Utilizar Drawer para:

Visualização de detalhes.

Configurações secundárias.

Informações complementares.

Evitar abrir múltiplos modais simultaneamente.

---

# Empty States

Toda tela vazia deverá orientar o usuário.

Exemplo:

Nenhum canal conectado.

Conecte seu primeiro canal para começar.

Nunca deixar telas completamente vazias.

---

# Feedback Visual

Toda ação deverá gerar resposta.

Exemplos:

Carregando...

Salvando...

Atualizando...

Concluído.

Erro.

Nunca deixar o usuário sem feedback.

---

# Skeleton Loading

Sempre que possível utilizar Skeleton.

Evitar telas piscando.

Evitar grandes áreas em branco.

A sensação de velocidade faz parte da experiência.

---

# Dashboard

O Dashboard deverá seguir sempre esta estrutura.

Resumo Geral

↓

Saúde da Operação

↓

KPIs

↓

Atividades

↓

Alertas

↓

Insights

Configurações nunca deverão aparecer antes da operação.

---

# Dashboards Futuros

Todos os dashboards deverão responder:

Como está minha operação?

Onde existem problemas?

Quais ações precisam ser tomadas?

Nunca criar dashboards apenas para mostrar gráficos.

---

# Navegação

Toda navegação deverá ser previsível.

O usuário nunca deverá procurar funcionalidades.

Cada módulo deverá possuir responsabilidades claras.

---

# Breadcrumb

Sempre utilizar breadcrumb em módulos profundos.

O usuário deve saber exatamente onde está.

---

# Estados

Todo componente deverá possuir estados padronizados.

Normal

Hover

Focus

Loading

Disabled

Erro

Sucesso

Nunca criar estados diferentes entre componentes semelhantes.

---

# Animações

As animações deverão ser discretas.

Duração curta.

Movimentos suaves.

Nunca competir com o conteúdo.

---

# Responsividade

O sistema deverá funcionar em:

Desktop

Notebook

Tablet

Mobile

Cada componente deverá prever comportamento responsivo.

---

# Componentes

Antes de criar um novo componente verificar:

Existe componente semelhante?

É possível reutilizar?

É possível parametrizar?

Sempre reutilizar antes de criar.

---

# Reutilização

Todo desenvolvimento deverá priorizar reutilização.

Duplicação deve ser evitada.

Novos componentes deverão existir apenas quando realmente necessários.

---

# Consistência

Toda nova tela deverá parecer que sempre fez parte do produto.

O usuário nunca deverá perceber diferenças de estilo entre módulos.

---

# Regra de Ouro

Nenhum componente deverá existir apenas porque é bonito.

Todo componente deverá aumentar:

clareza

produtividade

organização

consistência

percepção de valor

Caso contrário ele não deve existir.

---

# Identidade do Produto

O Integra Connect deverá ser reconhecido pela simplicidade.

Não pela quantidade de funcionalidades.

Não pela Inteligência Artificial.

Não pelos efeitos visuais.

O diferencial será uma experiência extremamente organizada, intuitiva e consistente.

