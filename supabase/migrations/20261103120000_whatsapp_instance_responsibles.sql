-- Responsável por um número WhatsApp: o atendente que pode reconectá-lo.
--
-- Parear, desparear e remover números era só de admin/gestor. Quando a sessão
-- de um número cai (03/11/2026: o número da Evelim parou de receber clientes),
-- quem está com o celular na mão é o atendente dono dele. Aqui o admin/gestor
-- marca esse atendente como responsável, e o backend libera para ele o QR, o
-- estado e o desconectar daquele número, e de nenhum outro.
--
-- phone_number é o número que esse pareamento tem que manter. O backend recusa
-- (desconecta) um QR lido pelo atendente com outro celular, para que ele não
-- troque o número da instância. Admin/gestor podem trocar, e o número novo
-- passa a ser o registrado. Só dígitos, como o external_id dos contatos.
--
-- Um responsável por número, e ele precisa ter acesso ao número
-- (whatsapp_instance_access): perder o acesso tira a responsabilidade.

CREATE TABLE public.whatsapp_instance_responsibles (
  instance_name TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number  TEXT CHECK (phone_number ~ '^[0-9]{8,15}$'),
  assigned_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instance_responsibles ENABLE ROW LEVEL SECURITY;

-- A tela de Conexões de qualquer usuário precisa saber se ele é o responsável.
CREATE POLICY "Authenticated users can select instance responsibles" ON public.whatsapp_instance_responsibles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Mesma divisão de whatsapp_instance_access: admin marca qualquer pessoa,
-- gestor só atendentes. Nos dois casos, só quem já tem acesso ao número.
CREATE POLICY "Admins can manage instance responsibles" ON public.whatsapp_instance_responsibles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_instance_access wia
      WHERE wia.instance_name = whatsapp_instance_responsibles.instance_name
        AND wia.user_id = whatsapp_instance_responsibles.user_id
    )
  );

CREATE POLICY "Managers can manage instance responsibles for agents" ON public.whatsapp_instance_responsibles
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = whatsapp_instance_responsibles.user_id AND tm.role = 'agent')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'manager'::app_role)
    AND EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = whatsapp_instance_responsibles.user_id AND tm.role = 'agent')
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_instance_access wia
      WHERE wia.instance_name = whatsapp_instance_responsibles.instance_name
        AND wia.user_id = whatsapp_instance_responsibles.user_id
    )
  );

-- Tirar o acesso tira a responsabilidade (não há FK: instance_name é texto solto).
CREATE OR REPLACE FUNCTION public.drop_responsible_on_access_revoke()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.whatsapp_instance_responsibles
  WHERE instance_name = OLD.instance_name AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER whatsapp_instance_access_drop_responsible
  AFTER DELETE ON public.whatsapp_instance_access
  FOR EACH ROW EXECUTE FUNCTION public.drop_responsible_on_access_revoke();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_instance_responsibles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instance_responsibles;
  END IF;
END $$;
