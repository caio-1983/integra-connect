-- Generalizes the per-account access grants and labels beyond WhatsApp.
--
-- `whatsapp_instance_access` gates conversations by matching its `instance_name`
-- against `conversations.metadata->>'instance'`
-- (can_access_conversation, 20260717120000). That match is channel-agnostic
-- already: as long as the Meta connector writes the Page ID / Instagram account
-- ID into `metadata.instance`, Instagram and Messenger conversations fall inside
-- the exact same grant-gated model with NO change to the security function.
--
-- IMPORTANT OPERATIONAL CONSEQUENCE: that also means nobody sees a new Meta
-- account's conversations until someone is granted access to it — consistent
-- with the deliberate "start from zero" rollout, but it will look like the
-- integration is broken if it isn't communicated.
--
-- The `channel` column added here is purely so the UI can group grants by
-- channel ("números de WhatsApp" vs "contas Meta"). It carries no authorization
-- meaning; the join is still on instance_name alone. The tables keep their
-- historical `whatsapp_` names — renaming them would break the RLS function and
-- every existing query for no functional gain.

ALTER TABLE public.whatsapp_instance_access
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.whatsapp_instance_labels
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';

COMMENT ON COLUMN public.whatsapp_instance_access.channel IS
  'Canal da conta concedida (whatsapp | instagram | facebook). Apenas para agrupamento na UI — a autorizacao continua sendo por instance_name.';
