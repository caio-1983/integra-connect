-- /campanhas/configurar liberada para qualquer usuário, não só admin/gestor.
--
-- A tela cadastra campanhas, edita, encerra e cria/remove regras de mapeamento.
-- Até aqui só admin/gestor gravava (20260810100100). Agora qualquer usuário
-- autenticado grava o que a tela faz.
--
-- Apagar campanha continua só com admin/gestor: a tela não apaga, encerra
-- (ended_at / is_active). As políticas "Admins and managers can manage ..."
-- ficam como estão; as daqui somam (políticas permissivas valem em OU).

CREATE POLICY "Authenticated users can insert campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update campaigns" ON public.campaigns
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert campaign mappings" ON public.campaign_mappings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update campaign mappings" ON public.campaign_mappings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete campaign mappings" ON public.campaign_mappings
  FOR DELETE USING (auth.role() = 'authenticated');
