-- Qualquer usuário autenticado volta a editar/encerrar qualquer campanha e a
-- editar/remover qualquer regra de mapeamento (como em 20261002140000).
--
-- 20261013150000 restringiu ao autor (created_by), e a Julia não conseguia
-- ajustar campanhas criadas pela Stefani. Inserção segue exigindo
-- created_by = auth.uid(); apagar campanha segue só com admin/gestor.

DROP POLICY IF EXISTS "Authors can update campaigns" ON public.campaigns;
CREATE POLICY "Authenticated users can update campaigns" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authors can update campaign mappings" ON public.campaign_mappings;
CREATE POLICY "Authenticated users can update campaign mappings" ON public.campaign_mappings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authors can delete campaign mappings" ON public.campaign_mappings;
CREATE POLICY "Authenticated users can delete campaign mappings" ON public.campaign_mappings
  FOR DELETE TO authenticated
  USING (true);
