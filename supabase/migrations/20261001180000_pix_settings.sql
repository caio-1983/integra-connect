-- Chave Pix da empresa (como no WhatsApp Business): o atendente envia pelo
-- composer um cartão com a razão social, a chave e o botão "Copiar chave Pix".
-- Uma linha só, da empresa inteira — todo atendente lê (prévia no envio); só
-- admin/gestor cadastra ou altera. O backend lê com service role na hora do
-- envio, então a chave que sai é sempre a cadastrada aqui.

CREATE TABLE IF NOT EXISTS public.pix_settings (
  id             boolean PRIMARY KEY DEFAULT true,
  merchant_name  text NOT NULL,
  key_type       text NOT NULL,
  -- Normalizada: só dígitos para CPF/CNPJ, +55… para telefone, e-mail minúsculo.
  pix_key        text NOT NULL,
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pix_settings_single_row CHECK (id),
  CONSTRAINT pix_settings_key_type CHECK (key_type IN ('cnpj', 'cpf', 'email', 'phone', 'random')),
  CONSTRAINT pix_settings_merchant_not_blank CHECK (length(btrim(merchant_name)) > 0),
  CONSTRAINT pix_settings_key_not_blank CHECK (length(btrim(pix_key)) > 0)
);

CREATE TRIGGER update_pix_settings_updated_at
  BEFORE UPDATE ON public.pix_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pix_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pix_settings" ON public.pix_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert pix_settings" ON public.pix_settings
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update pix_settings" ON public.pix_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_settings;
