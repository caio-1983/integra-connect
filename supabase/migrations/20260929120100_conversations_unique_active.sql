-- Uma conversa ativa por (contato, número) — ver 20260929120000.
--
-- Sem isto, duas mensagens simultâneas do mesmo contato criavam duas conversas.
-- Com isto, a corrida perdedora falha com 23505 e o backend relê a conversa
-- vencedora (ConversationRepository.findOrCreateConversation).
--
-- ATENÇÃO: só aplicar depois do deploy do backend que trata o 23505; o backend
-- antigo lança erro e perde a segunda mensagem.

CREATE UNIQUE INDEX conversations_one_active_per_contact_instance
  ON public.conversations (contact_id, (metadata->>'instance'))
  WHERE is_active;
