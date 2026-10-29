-- Limite de conversas fixadas por atendente: 5 → 8.
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
  ) >= 8 THEN
    RAISE EXCEPTION 'Limite de 8 conversas fixadas' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
