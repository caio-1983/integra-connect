-- Fixar conversas no topo (como o WhatsApp), até 5 por atendente.
--
-- Diferente do arquivamento (estado da conversa, igual para a equipe toda), a
-- fixação é de cada pessoa: cada atendente tem as suas 5 e só vê as suas.
--
-- Fixar não depende de arquivar: uma conversa fixada que alguém arquiva sai do
-- topo e para de contar no limite. Se o cliente escrever de novo e ela voltar
-- da lista de arquivadas, volta fixada.
--
-- Desafixar apaga a linha. O DELETE travado desde 20260707140000 vale para os
-- dados de atendimento. Esta tabela só guarda uma preferência de tela, então
-- o atendente pode apagar as próprias linhas.

CREATE TABLE public.conversation_pins (
  user_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE public.conversation_pins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.conversation_pins TO authenticated;

CREATE POLICY "Users can select own pins" ON public.conversation_pins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can pin conversations they can access" ON public.conversation_pins
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_conversation(conversation_id, auth.uid())
  );

CREATE POLICY "Users can unpin own pins" ON public.conversation_pins
  FOR DELETE USING (user_id = auth.uid());

-- Limite de 5, contando só as que estão no topo de fato (ativas e não arquivadas).
-- O lock por usuário evita que dois cliques simultâneos passem do limite.
CREATE OR REPLACE FUNCTION public.enforce_conversation_pin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('conversation_pins:' || NEW.user_id::text));
  IF (
    SELECT count(*)
    FROM public.conversation_pins p
    JOIN public.conversations c ON c.id = p.conversation_id
    WHERE p.user_id = NEW.user_id
      AND c.is_active
      AND c.archived_at IS NULL
  ) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 conversas fixadas' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_conversation_pin_limit
  BEFORE INSERT ON public.conversation_pins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_pin_limit();
