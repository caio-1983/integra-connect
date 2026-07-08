-- Per-user access control by WhatsApp instance/number. Multiple attendants
-- can share access to the same number (many-to-many). Admin/manager bypass
-- entirely (see everything, matching the rest of the RBAC model); agents are
-- restricted to conversations whose tracked instance they've been granted.
-- Conversations with no tracked instance (metadata->>'instance' IS NULL --
-- legacy rows predating instance-tracking) stay visible to everyone, same as
-- today, so this feature never makes an existing conversation "disappear".

CREATE TABLE public.whatsapp_instance_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_name, user_id)
);

-- No `whatsapp_instances` table exists -- instance_name is a bare string (the
-- Evolution instanceName), not a FK. Renaming an instance in Evolution orphans
-- its grants; already-open conversations keep the old name frozen in
-- metadata.instance so nothing breaks retroactively, but a *new* conversation
-- under the renamed instance would need grants re-created under the new name.

CREATE INDEX idx_whatsapp_instance_access_instance_name ON public.whatsapp_instance_access (instance_name);
CREATE INDEX idx_whatsapp_instance_access_user_id ON public.whatsapp_instance_access (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_metadata_instance ON public.conversations ((metadata ->> 'instance'));

ALTER TABLE public.whatsapp_instance_access ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read grants (needed to compute "who else has
-- access to this instance" for the transfer-target list on the client).
CREATE POLICY "Authenticated users can select instance access" ON public.whatsapp_instance_access
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage instance access" ON public.whatsapp_instance_access
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Managers can grant/revoke only for agent-role team members -- mirrors the
-- admin/manager split already established for team_members management
-- (20260707150100_rbac_manager_permissions.sql).
CREATE POLICY "Managers can manage instance access for agents" ON public.whatsapp_instance_access
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = whatsapp_instance_access.user_id AND tm.role = 'agent')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = whatsapp_instance_access.user_id AND tm.role = 'agent')
  );

-- Central access-check, reused by both conversations and messages so the rule
-- is defined once. Admin/manager bypass; a conversation with no tracked
-- instance is visible to everyone (see file header); otherwise requires a
-- matching grant row.
CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'manager'::app_role)
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

-- conversations: replace the current fully-open SELECT/UPDATE policies (from
-- 20260707140000_lock_down_data_deletion.sql) with instance-scoped ones.
-- INSERT is untouched -- no frontend code inserts into conversations
-- directly, all real inserts go through the backend's service-role client,
-- which bypasses RLS entirely.
DROP POLICY IF EXISTS "Authenticated users can select conversations" ON public.conversations;
CREATE POLICY "Authenticated users can select conversations" ON public.conversations
  FOR SELECT USING (auth.role() = 'authenticated' AND public.can_access_conversation(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update conversations" ON public.conversations;
CREATE POLICY "Authenticated users can update conversations" ON public.conversations
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.can_access_conversation(id, auth.uid()))
  WITH CHECK (auth.role() = 'authenticated' AND public.can_access_conversation(id, auth.uid()));

-- messages: same treatment, scoped through the parent conversation.
DROP POLICY IF EXISTS "Authenticated users can select messages" ON public.messages;
CREATE POLICY "Authenticated users can select messages" ON public.messages
  FOR SELECT USING (auth.role() = 'authenticated' AND public.can_access_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update messages" ON public.messages;
CREATE POLICY "Authenticated users can update messages" ON public.messages
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.can_access_conversation(conversation_id, auth.uid()))
  WITH CHECK (auth.role() = 'authenticated' AND public.can_access_conversation(conversation_id, auth.uid()));

-- Add the new table to realtime so the admin UI can live-update instead of
-- polling (same idempotent guard used across earlier migrations).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_instance_access') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instance_access;
  END IF;
END $$;
