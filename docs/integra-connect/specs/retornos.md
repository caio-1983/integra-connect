# Retornos Operacionais

Versão 1.0

Sprint 006 — Etapa 1

Referência: [PD-004 — Retornos Operacionais](../decisions/PD-004-retornos-operacionais.md)

---

# Objetivo

Garantir que nenhum compromisso assumido durante um atendimento seja esquecido.

Transformar a promessa feita ao cliente em uma ação operacional com data, responsável e acompanhamento.

Eliminar a dependência da memória individual do vendedor.

---

# Problema de negócio

Durante o atendimento o cliente frequentemente solicita ser contactado em uma data futura.

Essa solicitação é recebida, compreendida e respondida com uma promessa.

Mas a promessa não se transforma em ação.

Com o volume de atendimentos do dia, a conversa avança na fila.

O cliente some entre os demais contatos.

O vendedor não recebe nenhum aviso.

O cliente não recebe retorno.

A oportunidade é perdida.

---

O problema não está na falta de vontade.

O problema está na ausência de um mecanismo que transforme a promessa em compromisso operacional.

---

Consequências observadas:

• Clientes que não recebem retorno não compram.

• Clientes que não recebem retorno perdem a confiança na empresa.

• Vendedores que esquecem retornos perdem comissão.

• Gestores não conseguem monitorar o follow-up da equipe.

• A empresa perde vendas por falha de processo, não por falta de oportunidade.

---

# Cenários de uso

## Cenário 1 — Cliente adia a decisão

O cliente está em atendimento e diz:

"Me chama sexta-feira de manhã."

O operador registra um Retorno para sexta-feira às 09h.

Na sexta, o sistema apresenta esse cliente como prioridade operacional.

O operador inicia o contato sem precisar lembrar.

---

## Cenário 2 — Decisão compartilhada

O cliente diz:

"Vou conversar com minha esposa antes de fechar."

O operador registra um Retorno para daqui a três dias.

Após três dias, o sistema lembra o operador de retornar o contato.

---

## Cenário 3 — Prazo indefinido

O cliente diz:

"Semana que vem eu decido."

O operador registra um Retorno para a próxima segunda-feira.

O sistema organiza essa conversa para ser retomada na data correta.

---

## Cenário 4 — Aguardando terceiro

O cliente diz:

"Estou esperando meu arquiteto responder."

O operador registra um Retorno para daqui a cinco dias com a observação "aguardando arquiteto".

---

## Cenário 5 — Após envio de proposta

O operador acabou de enviar um orçamento.

Registra um Retorno para dois dias depois com a observação "verificar se o cliente analisou a proposta".

---

## Cenário 6 — Retorno urgente

O cliente disse que liga de volta em uma hora.

O operador registra um Retorno para daqui a uma hora.

Se o cliente não ligar, o sistema apresenta o Retorno na tela de Operações.

---

# Fluxo operacional

## 1. Identificação

Durante o atendimento o operador percebe que o cliente solicitou um retorno futuro.

Isso pode ocorrer de forma explícita ("me chama sexta") ou implícita ("vou pensar").

---

## 2. Registro

O operador acessa a ação de Retorno diretamente dentro da conversa.

Preenche as informações mínimas:

• Data do retorno

• Horário (opcional)

• Observação (opcional)

O sistema vincula automaticamente o Retorno ao cliente e à conversa em andamento.

---

## 3. Confirmação

O sistema confirma o registro.

O operador visualiza o Retorno salvo dentro da conversa.

A conversa continua normalmente.

---

## 4. Notificação

Quando a data do Retorno chegar, o sistema apresenta esse cliente na tela de Operações.

O operador vê claramente:

• Quem é o cliente.

• Quando foi combinado.

• O que foi dito.

• O que precisa ser feito.

---

## 5. Ação

O operador retoma o contato diretamente a partir da tela de Operações.

Após realizar o retorno, registra o resultado:

• Realizado

• Reagendado

• Cancelado

---

## 6. Encerramento

O Retorno é encerrado.

O histórico permanece disponível no perfil do cliente.

---

# Regras de negócio

## Criação

Todo Retorno deve estar vinculado a uma conversa ativa.

Todo Retorno deve ter um responsável.

Todo Retorno deve ter uma data.

Mais de um Retorno pode ser registrado para o mesmo cliente.

O mesmo operador pode ter múltiplos Retornos ativos simultaneamente.

---

## Responsabilidade

O Retorno pertence ao operador que o registrou.

Gestores podem visualizar Retornos de todos os operadores.

Gestores podem reatribuir um Retorno para outro operador.

---

## Ativação

O Retorno entra em estado ativo na data definida.

Um Retorno ativo deve aparecer obrigatoriamente na tela de Operações.

O sistema não remove automaticamente um Retorno ativo até que o operador o encerre.

---

## Prazo

Um Retorno sem ação após três dias em estado ativo deverá ser destacado visualmente como atrasado.

Um Retorno atrasado não desaparece.

Um Retorno atrasado permanece visível até ser encerrado pelo operador.

---

## Encerramento

Somente o operador responsável ou um gestor podem encerrar um Retorno.

Ao encerrar, o operador deverá indicar o resultado.

O encerramento é obrigatório para que o Retorno saia da tela de Operações.

---

## Cancelamento

Um Retorno pode ser cancelado caso o cliente tenha fechado, desistido ou o contato se tornado irrelevante.

O cancelamento deverá exigir uma justificativa mínima.

---

## Histórico

Todo Retorno encerrado deve permanecer no histórico do cliente.

O histórico deve permitir visualizar quantos retornos foram feitos, quando e qual foi o resultado.

---

# Estados

## Agendado

O Retorno foi registrado.

A data ainda não chegou.

O cliente aguarda ser contactado na data combinada.

---

## Ativo

A data do Retorno chegou.

O cliente aparece na tela de Operações.

O operador deve agir.

---

## Atrasado

O Retorno está ativo há mais de três dias sem ação.

O sistema destaca visualmente esse Retorno.

O gestor é capaz de identificar Retornos atrasados da equipe.

---

## Realizado

O operador entrou em contato com o cliente conforme combinado.

O Retorno foi concluído com sucesso.

---

## Reagendado

O operador tentou o contato mas o cliente solicitou nova data.

Um novo Retorno é gerado automaticamente.

O Retorno anterior é encerrado.

---

## Cancelado

O Retorno não será mais necessário.

O contato foi encerrado, perdido ou se tornou irrelevante.

---

# Estrutura de dados conceitual

Um Retorno é composto pelas seguintes informações.

---

**Responsável**

O operador que assumiu o compromisso com o cliente.

---

**Cliente**

O contato ao qual o Retorno está vinculado.

---

**Conversa**

A conversa onde o compromisso foi assumido.

---

**Data**

Quando o retorno deve ocorrer.

---

**Horário**

A que horas o contato deve ser feito.

Opcional.

---

**Prioridade**

Nível de urgência do Retorno.

Alta, média ou baixa.

---

**Observação**

O que foi combinado. O contexto que o operador precisa saber antes de retornar.

Exemplo: "cliente vai consultar arquiteto", "aguardando aprovação financeira", "enviamos proposta no dia 20".

---

**Estado**

Situação atual do Retorno: Agendado, Ativo, Atrasado, Realizado, Reagendado ou Cancelado.

---

**Resultado**

Registrado no momento do encerramento.

O que aconteceu quando o operador fez o contato.

---

**Histórico de alterações**

Registro de quem criou, quem alterou, quem encerrou e quando.

---

# Impacto na tela Operações

A tela de Operações é onde o operador inicia seu dia de trabalho.

Ela deve responder imediatamente:

"O que precisa ser feito hoje?"

---

## Seção Retornos do Dia

A tela de Operações deverá apresentar uma seção dedicada aos Retornos com data igual ou anterior a hoje.

Cada item deverá mostrar:

• Nome do cliente

• Canal de origem

• Data em que o retorno foi combinado

• Observação registrada pelo operador

• Tempo em aberto

• Botão de ação direta para abrir a conversa

---

## Ordenação

Os Retornos devem ser ordenados por prioridade e tempo em aberto.

Retornos atrasados aparecem no topo.

Retornos com alta prioridade aparecem antes dos demais.

---

## Visão do Gestor

O gestor deve conseguir filtrar Retornos por:

• Operador responsável

• Estado

• Data

• Prioridade

O gestor deve visualizar Retornos atrasados da equipe de forma destacada.

---

## Comportamento

Um Retorno ativo não sai da tela de Operações por conta própria.

Ele sai apenas quando o operador registra um resultado.

Isso garante que nenhum cliente seja esquecido mesmo que o operador feche o sistema e volte no dia seguinte.

---

# Impacto no Atendimento

Durante uma conversa, o operador deve conseguir registrar um Retorno com o menor número possível de cliques.

---

## Ação

Dentro da tela de Atendimento deverá existir uma ação acessível chamada:

"Agendar Retorno"

Essa ação deve estar disponível na barra lateral da conversa ou em um menu de ações rápidas.

---

## Formulário mínimo

Ao acionar a criação de um Retorno, o sistema deve solicitar apenas:

• Data

• Horário (opcional)

• Observação (opcional)

O sistema preenche automaticamente o responsável, o cliente e a conversa.

---

## Confirmação visual

Após criar um Retorno, a conversa deve exibir uma indicação visual de que existe um Retorno agendado.

Exemplo: ícone ou tag "Retorno agendado para 27/06 às 09h".

---

## Edição

O operador deve conseguir editar ou cancelar um Retorno diretamente dentro da conversa.

---

## Histórico na conversa

O histórico da conversa deve registrar os eventos relacionados ao Retorno:

• Retorno criado em [data] por [operador]

• Retorno realizado em [data]

• Retorno cancelado em [data] — motivo: [motivo]

---

# Inteligência Artificial

Nesta primeira versão a criação do Retorno é sempre manual.

O operador identifica a necessidade e registra.

---

Em versão futura a IA poderá identificar automaticamente frases que indicam solicitação de retorno:

• "Me chama depois."

• "Semana que vem."

• "Vou pensar."

• "Retorna sexta."

• "Vou decidir."

• "Aguarda meu retorno."

Quando a IA identificar uma dessas frases, sugerirá ao operador a criação de um Retorno.

A decisão final sempre será do operador.

A IA nunca criará um Retorno de forma autônoma.

---

# Critérios de aceite

## Criação

O operador consegue registrar um Retorno durante uma conversa ativa.

O formulário de criação é simples e direto.

O sistema vincula automaticamente o Retorno ao cliente e à conversa.

O Retorno aparece visualmente dentro da conversa após ser registrado.

---

## Ativação

No dia e horário combinados, o Retorno aparece na tela de Operações.

O operador visualiza claramente o cliente, o contexto e a observação.

O operador acessa a conversa diretamente a partir do Retorno.

---

## Atraso

Após três dias sem ação, o Retorno é destacado como atrasado.

O gestor visualiza Retornos atrasados da equipe.

O Retorno atrasado não desaparece da tela de Operações.

---

## Encerramento

O operador consegue registrar o resultado do Retorno.

Após o encerramento, o Retorno sai da tela de Operações.

O histórico do cliente exibe todos os Retornos com seus resultados.

---

## Experiência

O processo completo — do registro ao encerramento — não exige mais de três cliques.

O operador nunca precisa sair do contexto da conversa para registrar um Retorno.

O gestor consegue acompanhar a situação de todos os Retornos da equipe em uma única visão.

Nenhum Retorno ativo pode ser ignorado pelo sistema.

---

## Princípio inviolável

Nenhum cliente deverá ser perdido porque o vendedor esqueceu de retornar.

Se o sistema funciona corretamente, esse cenário deixa de existir.
