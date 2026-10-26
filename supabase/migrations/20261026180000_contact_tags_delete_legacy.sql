-- Tags anteriores a 20261026120000 entraram sem autor (created_by NULL) e a
-- política de DELETE só aceitava o próprio autor — atendente não conseguia
-- tirar uma tag que ele mesmo tinha posto antes da migração. Tag sem autor é
-- visível a todos, então qualquer um com acesso ao contato pode removê-la.

DROP POLICY IF EXISTS contact_tags_delete ON public.contact_tags;
CREATE POLICY contact_tags_delete ON public.contact_tags
  FOR DELETE TO authenticated
  USING (
    public.can_access_contact(contact_id, auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid() OR public.is_manager_or_admin(auth.uid()))
  );
