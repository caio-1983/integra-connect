-- Tags por usuário.
--
-- Uma tag colocada por um atendente só é vista por ele, por gestores e por
-- admins — outro atendente que fale com o mesmo contato não a vê. Cada tag
-- vira uma linha em contact_tags com quem a colocou (created_by).
--
-- As tags que já existiam não registram autor: entram com created_by NULL e
-- continuam visíveis a todos (decisão de 26/10/2026).
--
-- contacts.tags continua existindo como espelho (união de todas as tags),
-- mantido por trigger: o gatilho pedido_finalizado → Ganho
-- (20261005170000) e o resto do banco seguem lendo de lá. A UI passa a ler
-- só contact_tags.

CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_tags_unique UNIQUE NULLS NOT DISTINCT (contact_id, tag, created_by)
);

CREATE INDEX IF NOT EXISTS contact_tags_contact_idx ON public.contact_tags (contact_id);

-- Tags que já existiam: sem autor, visíveis a todos. conversations.tags era
-- dado morto que a UI somava ao do contato — entra junto para nada sumir.
INSERT INTO public.contact_tags (contact_id, tag, created_by)
SELECT DISTINCT contact_id, tag, NULL::uuid
FROM (
  SELECT ct.id AS contact_id, unnest(ct.tags) AS tag FROM public.contacts ct
  UNION
  SELECT c.contact_id, unnest(c.tags) FROM public.conversations c WHERE c.contact_id IS NOT NULL
) t
WHERE tag IS NOT NULL AND tag <> ''
ON CONFLICT ON CONSTRAINT contact_tags_unique DO NOTHING;

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'manager'::app_role)
$$;
REVOKE EXECUTE ON FUNCTION public.is_manager_or_admin(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS contact_tags_select ON public.contact_tags;
CREATE POLICY contact_tags_select ON public.contact_tags
  FOR SELECT TO authenticated
  USING (
    public.can_access_contact(contact_id, auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  );

DROP POLICY IF EXISTS contact_tags_insert ON public.contact_tags;
CREATE POLICY contact_tags_insert ON public.contact_tags
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_access_contact(contact_id, auth.uid()));

-- Atendente remove só as que colocou; gestor/admin removem qualquer uma.
DROP POLICY IF EXISTS contact_tags_delete ON public.contact_tags;
CREATE POLICY contact_tags_delete ON public.contact_tags
  FOR DELETE TO authenticated
  USING (
    public.can_access_contact(contact_id, auth.uid())
    AND (created_by = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  );

GRANT SELECT, INSERT, DELETE ON public.contact_tags TO authenticated;

-- Espelho em contacts.tags (união de todos os autores).
CREATE OR REPLACE FUNCTION public.sync_contact_tags_mirror()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contact UUID := COALESCE(NEW.contact_id, OLD.contact_id);
BEGIN
  UPDATE public.contacts
  SET tags = COALESCE((SELECT array_agg(DISTINCT tag ORDER BY tag) FROM public.contact_tags WHERE contact_id = _contact), '{}')
  WHERE id = _contact;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contact_tags_mirror ON public.contact_tags;
CREATE TRIGGER contact_tags_mirror
  AFTER INSERT OR DELETE ON public.contact_tags
  FOR EACH ROW EXECUTE FUNCTION public.sync_contact_tags_mirror();
