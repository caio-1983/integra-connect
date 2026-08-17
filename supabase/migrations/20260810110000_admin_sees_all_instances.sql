-- Admin sees every number again; every other role stays grant-gated.
--
-- 20260717120000 made access grant-gated for ALL roles, admins included. The
-- first production trial showed why that is unworkable as the only rule: an
-- account created AFTER someone finished ticking the "Acesso" checklist is
-- invisible to that checklist, so it silently gets no number at all. That is
-- exactly what happened -- grants were written at 2026-07-17 19:41 and the
-- manager's account was created at 19:47, six minutes later. Nobody went back,
-- and with no admin able to see the conversations either, there was no vantage
-- point from which to notice.
--
-- Product decision (2026-08-10): an ADMIN sees every conversation, without
-- needing a grant. Managers and agents keep seeing only the numbers explicitly
-- checked for them. That restores a supervision vantage point and, just as
-- importantly, makes a newly connected number visible to somebody by default --
-- expressing this as policy rather than as seeded grant rows is the whole point,
-- since seeded rows go stale the moment a new instance is connected.
--
-- Deliberately NOT restoring the manager bypass that existed before
-- 20260717120000: "todos os outros só os números designados" includes managers.
--
-- Unchanged: the "no tracked instance" escape (metadata.instance IS NULL stays
-- visible to everyone, so legacy rows never disappear), and every write policy
-- on whatsapp_instance_access -- an admin still manages grants for anyone, a
-- manager still only for agents.

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin bypass: supervision requires someone who can always see the room.
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conversation_id AND c.metadata ->> 'instance' IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.whatsapp_instance_access wia ON wia.instance_name = c.metadata ->> 'instance'
      WHERE c.id = _conversation_id AND wia.user_id = _user_id
    )
$$;
