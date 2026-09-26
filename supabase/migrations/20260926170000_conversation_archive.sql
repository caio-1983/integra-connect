-- Arquivar conversas (como o WhatsApp).
--
-- archived_at != NULL tira a conversa da fila principal e a move para a lista
-- "Arquivadas" (onde pode ser buscada). O arquivamento é da conversa, não do
-- operador: a caixa é compartilhada, então todos veem o mesmo estado.
--
-- Igual ao WhatsApp, a conversa sai do arquivo sozinha quando o cliente manda
-- mensagem nova. Respostas da equipe (inclusive ecos do celular) não desarquivam.

ALTER TABLE public.conversations ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX conversations_archived_idx
  ON public.conversations (last_message_at DESC)
  WHERE is_active AND archived_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.unarchive_conversation_on_inbound()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.from_type = 'user' THEN
    UPDATE public.conversations
       SET archived_at = NULL
     WHERE id = NEW.conversation_id
       AND archived_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER unarchive_conversation_on_inbound
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.unarchive_conversation_on_inbound();
