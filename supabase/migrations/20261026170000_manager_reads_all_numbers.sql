-- Gestor vê os resultados consolidados de todos os números.
--
-- 20261013150000 passou contatos, negócios e atribuição pelo acesso por número
-- (can_access_contact). Isso está certo para o atendimento, mas deixava o placar
-- de campanhas e os relatórios de um gestor incompletos: leads de um número sem
-- acesso sumiam dos números. Aqui só a LEITURA ganha uma faixa extra para
-- gestor/admin; escrita e as conversas do chat seguem o acesso por número.
--
-- Números privados (whatsapp_private_instances) continuam só do dono, como em
-- can_access_contact.

CREATE OR REPLACE FUNCTION public.can_read_contact(_contact_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_contact(_contact_id, _user_id)
    OR (
      (public.has_role(_user_id, 'manager'::app_role) OR public.has_role(_user_id, 'admin'::app_role))
      AND EXISTS (
        SELECT 1
        FROM public.conversations c
        LEFT JOIN public.whatsapp_private_instances p ON p.instance_name = c.metadata ->> 'instance'
        WHERE c.contact_id = _contact_id AND p.instance_name IS NULL
      )
    )
$$;

DROP POLICY IF EXISTS "Authenticated users can select contacts" ON public.contacts;
CREATE POLICY "Authenticated users can select contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.can_read_contact(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can select deals" ON public.deals;
CREATE POLICY "Authenticated users can select deals" ON public.deals
  FOR SELECT TO authenticated
  USING (contact_id IS NULL OR public.can_read_contact(contact_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can select deal sale detections" ON public.deal_sale_detections;
CREATE POLICY "Authenticated users can select deal sale detections" ON public.deal_sale_detections
  FOR SELECT TO authenticated
  USING (public.can_read_contact(contact_id, auth.uid()));

-- lead_attribution_resolved é security_invoker e herda.
DROP POLICY IF EXISTS "Authenticated users can select lead attribution" ON public.contact_attribution;
CREATE POLICY "Authenticated users can select lead attribution" ON public.contact_attribution
  FOR SELECT TO authenticated
  USING (public.can_read_contact(contact_id, auth.uid()));
