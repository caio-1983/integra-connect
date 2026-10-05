-- A deal with no owner ("Sem responsável") takes the attendant who answered the
-- contact. The first human reply sent through the app (messages.sent_by, an
-- auth user) is mapped to that person's team_members row, which is what
-- deals.owner_id references. An owner already set — chosen by hand or written by
-- api.assignConversation — is never overwritten. Hidden maintenance accounts are
-- skipped. Replies typed on the phone carry no sent_by and assign nobody.

CREATE OR REPLACE FUNCTION public.set_deal_owner_from_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_contact_id uuid;
BEGIN
  IF NEW.sent_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tm.id INTO v_member_id
  FROM public.team_members tm
  WHERE tm.user_id = NEW.sent_by AND NOT COALESCE(tm.hidden, false)
  LIMIT 1;
  IF v_member_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT contact_id INTO v_contact_id FROM public.conversations WHERE id = NEW.conversation_id;
  IF v_contact_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.deals
  SET owner_id = v_member_id
  WHERE contact_id = v_contact_id
    AND owner_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_deal_owner ON public.messages;
CREATE TRIGGER messages_set_deal_owner
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.sent_by IS NOT NULL)
  EXECUTE FUNCTION public.set_deal_owner_from_reply();

-- Backfill: existing ownerless deals get the first attendant who replied to
-- that contact.
WITH first_reply AS (
  SELECT DISTINCT ON (cv.contact_id) cv.contact_id, tm.id AS member_id
  FROM public.messages m
  JOIN public.conversations cv ON cv.id = m.conversation_id
  JOIN public.team_members tm ON tm.user_id = m.sent_by AND NOT COALESCE(tm.hidden, false)
  WHERE m.sent_by IS NOT NULL
  ORDER BY cv.contact_id, m.sent_at, m.id
)
UPDATE public.deals d
SET owner_id = fr.member_id
FROM first_reply fr
WHERE d.contact_id = fr.contact_id
  AND d.owner_id IS NULL;
