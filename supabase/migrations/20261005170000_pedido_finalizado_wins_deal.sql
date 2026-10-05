-- Tag "Pedido Finalizado" (key `pedido_finalizado`) on a contact means the sale
-- closed, so every not-yet-won deal of that contact moves to the Ganho stage.
-- Runs in the database so it holds no matter who sets the tag (chat UI, contact
-- list, backend, AI). Fires only when the tag is newly added; removing it later
-- does not reopen the deal. The deal value is kept as is (edit it on the card).
-- `deals_record_stage_change` still records the move in deal_stage_history.

CREATE OR REPLACE FUNCTION public.win_deals_on_pedido_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ganho_id uuid;
BEGIN
  IF NOT ('pedido_finalizado' = ANY(COALESCE(NEW.tags, '{}'))) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND 'pedido_finalizado' = ANY(COALESCE(OLD.tags, '{}')) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_ganho_id
  FROM public.pipeline_stages
  WHERE is_system AND is_active AND lower(title) = 'ganho'
  LIMIT 1;

  IF v_ganho_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.deals
  SET stage_id = v_ganho_id,
      stage = 'won',
      won_at = now(),
      lost_at = NULL,
      lost_reason = NULL,
      lost_reason_code = NULL
  WHERE contact_id = NEW.id
    AND won_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_pedido_finalizado_wins_deal ON public.contacts;
CREATE TRIGGER contacts_pedido_finalizado_wins_deal
  AFTER INSERT OR UPDATE OF tags ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.win_deals_on_pedido_finalizado();

-- Backfill: contacts already tagged before this migration.
UPDATE public.deals d
SET stage_id = s.id,
    stage = 'won',
    won_at = now(),
    lost_at = NULL,
    lost_reason = NULL,
    lost_reason_code = NULL
FROM public.contacts c,
     (SELECT id FROM public.pipeline_stages
      WHERE is_system AND is_active AND lower(title) = 'ganho' LIMIT 1) s
WHERE d.contact_id = c.id
  AND d.won_at IS NULL
  AND 'pedido_finalizado' = ANY(c.tags);
