-- Respostas rápidas: sem bloqueio por papel ou autor. Qualquer autenticado
-- cadastra, edita e apaga qualquer resposta, e todas ficam visíveis para todos.

DROP POLICY IF EXISTS "Admins and managers can insert quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Admins and managers can update quick_replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Admins and managers can delete quick_replies" ON public.quick_replies;

CREATE POLICY "Authenticated can insert quick_replies" ON public.quick_replies
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update quick_replies" ON public.quick_replies
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete quick_replies" ON public.quick_replies
  FOR DELETE TO authenticated
  USING (true);
