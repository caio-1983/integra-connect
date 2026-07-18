-- Custom display label for a WhatsApp connection card (settings/channels).
--
-- There is no `whatsapp_instances` table — an instance is a bare Evolution
-- instanceName string — so a rename can't be a column and renaming the Evolution
-- instance itself would orphan its access grants (keyed by instance_name). This
-- overlay table holds an optional friendly label per instance_name, exactly like
-- whatsapp_instance_access (20260707160000): everyone reads it (the card shows
-- it), only admins/managers write it (they already manage the connections).

CREATE TABLE public.whatsapp_instance_labels (
  instance_name TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instance_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select instance labels" ON public.whatsapp_instance_labels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage instance labels" ON public.whatsapp_instance_labels
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Realtime so a rename reflects live across sessions (same idempotent guard
-- used across earlier migrations).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_instance_labels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instance_labels;
  END IF;
END $$;
