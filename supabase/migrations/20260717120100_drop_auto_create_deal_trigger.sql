-- A lead is created only when a contact sends a message — never on import.
--
-- The auto_create_deal_on_contact trigger fired AFTER INSERT on EVERY contact
-- and created a deal, flooding the pipeline with every bulk-imported
-- address-book entry. The backend already creates the lead on the first inbound
-- message (ConversationService.onInboundMessage -> createLeadForContact), so the
-- trigger is redundant and wrong. This matches clone_to_new_project.sql, which
-- never installs it.
--
-- NOTE: two "post_remix_consolidated_fixes" migrations (20260623125537 and
-- 20260623125625) reintroduced this trigger — keep any future consolidation
-- migration from re-adding it.

DROP TRIGGER IF EXISTS auto_create_deal_on_contact ON public.contacts;

-- Clean up the false leads already created during the production trial
-- (product owner chose "clean now"). A real lead = a contact that sent us an
-- inbound message (messages.from_type = 'user'); delete every other deal.
-- Safety guards: keep deals not linked to a contact (contact_id IS NULL —
-- manual/unlinked) and keep won deals (won_at IS NOT NULL). This runs as the
-- migration/service role, so it bypasses the DELETE-lockdown RLS from
-- 20260707140000. To review the volume before applying by hand, run the same
-- predicate as a SELECT count(*) first:
--
--   SELECT count(*) FROM public.deals d
--   WHERE d.contact_id IS NOT NULL AND d.won_at IS NULL
--     AND NOT EXISTS (
--       SELECT 1 FROM public.conversations c
--       JOIN public.messages m ON m.conversation_id = c.id
--       WHERE c.contact_id = d.contact_id AND m.from_type = 'user'
--     );

DELETE FROM public.deals d
WHERE d.contact_id IS NOT NULL
  AND d.won_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.contact_id = d.contact_id
      AND m.from_type = 'user'
  );
