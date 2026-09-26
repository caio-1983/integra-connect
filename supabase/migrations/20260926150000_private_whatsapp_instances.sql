-- Private WhatsApp numbers: visible to exactly one user, admins included.
--
-- 20260810110000 gave admins a bypass over every number. Product decision
-- (2026-09-26): Juliana's personal number ("Juliana Coutinho") must be seen by
-- nobody but her -- not other admins, not via a grant on the "Acesso" sheet.
--
-- A private instance has a single owner. For those instances the admin bypass
-- and whatsapp_instance_access grants are both ignored: only the owner matches.
-- Every other instance keeps the 20260810110000 rule unchanged.
--
-- No write policy on purpose: marking/unmarking a number private is a
-- migration-level decision, so no admin can lift it from inside the app.

CREATE TABLE public.whatsapp_private_instances (
  instance_name TEXT PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_private_instances ENABLE ROW LEVEL SECURITY;

-- Readable so the client can hide private numbers from its instance pickers.
CREATE POLICY "Authenticated users can select private instances" ON public.whatsapp_private_instances
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT
      CASE
        WHEN p.instance_name IS NOT NULL THEN p.owner_user_id = _user_id
        ELSE
          public.has_role(_user_id, 'admin'::app_role)
          OR c.metadata ->> 'instance' IS NULL
          OR EXISTS (
            SELECT 1 FROM public.whatsapp_instance_access wia
            WHERE wia.instance_name = c.metadata ->> 'instance' AND wia.user_id = _user_id
          )
      END
    FROM public.conversations c
    LEFT JOIN public.whatsapp_private_instances p ON p.instance_name = c.metadata ->> 'instance'
    WHERE c.id = _conversation_id
  ), false)
$$;

INSERT INTO public.whatsapp_private_instances (instance_name, owner_user_id)
VALUES ('Juliana Coutinho', 'c563671a-bf0d-41d3-8cf3-e93e128fceff');
