-- Respostas rápidas (como no WhatsApp Business): um atalho + o texto que ele
-- insere no composer. Compartilhadas pela empresa inteira — todo atendente
-- lê e usa; só admin/gestor cadastra, edita ou apaga.

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut    text NOT NULL,
  message     text NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quick_replies_shortcut_format CHECK (shortcut ~ '^[a-z0-9_-]{1,30}$'),
  CONSTRAINT quick_replies_message_not_blank CHECK (length(btrim(message)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_shortcut_key ON public.quick_replies (shortcut);

CREATE TRIGGER update_quick_replies_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read quick_replies" ON public.quick_replies
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert quick_replies" ON public.quick_replies
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can update quick_replies" ON public.quick_replies
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can delete quick_replies" ON public.quick_replies
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_replies;
