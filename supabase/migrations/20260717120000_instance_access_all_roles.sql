-- Instance access now applies to EVERY role, admin/manager included.
--
-- Previously admin/manager bypassed can_access_conversation() entirely (they
-- saw every conversation regardless of grants). Per product decision after the
-- production trial, access to a WhatsApp number must be explicitly granted for
-- ALL roles -- an admin/manager only sees the numbers checked for them on the
-- "Acesso" sheet, exactly like an agent.
--
-- Rollout = "start from zero": this migration does NOT seed any grants. On
-- deploy, admins/managers stop seeing conversations until they are granted a
-- number. This is expected, not a bug -- an admin can grant themselves via the
-- Acesso sheet because grant management (the whatsapp_instance_access RLS
-- policies below) does NOT depend on conversation access.
--
-- What is intentionally UNCHANGED:
--   * The "no tracked instance" escape: conversations whose metadata.instance
--     IS NULL (legacy rows predating instance-tracking) stay visible to
--     everyone, so nothing retroactively disappears.
--   * The write policies: the admin policy (has_role admin, no target filter)
--     lets an admin manage grants for any user (admin/manager/agent, self
--     included). The manager policy stays scoped to agent targets -- a manager
--     never grants number access to an admin/manager (incl. themselves); only
--     an admin assigns numbers to admins/managers. Mirrors the RBAC hierarchy
--     from 20260707150100_rbac_manager_permissions.sql.

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- No admin/manager bypass anymore: access is granted purely by a matching
  -- whatsapp_instance_access row, plus the legacy "no tracked instance" escape.
  SELECT
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conversation_id AND c.metadata ->> 'instance' IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.whatsapp_instance_access wia ON wia.instance_name = c.metadata ->> 'instance'
      WHERE c.id = _conversation_id AND wia.user_id = _user_id
    )
$$;
