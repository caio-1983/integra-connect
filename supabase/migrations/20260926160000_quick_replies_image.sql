-- Respostas rápidas com imagem: a imagem fica no bucket público
-- quick-reply-media e sai no chat como anexo, com a mensagem como legenda.
-- Com imagem, a mensagem pode ficar vazia (só a imagem é enviada).

ALTER TABLE public.quick_replies
  ADD COLUMN IF NOT EXISTS image_path text;

ALTER TABLE public.quick_replies
  DROP CONSTRAINT IF EXISTS quick_replies_message_not_blank;

ALTER TABLE public.quick_replies
  ADD CONSTRAINT quick_replies_message_or_image
  CHECK (length(btrim(message)) > 0 OR image_path IS NOT NULL);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quick-reply-media', 'quick-reply-media', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read quick-reply-media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'quick-reply-media');

CREATE POLICY "Authenticated insert quick-reply-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quick-reply-media');

CREATE POLICY "Authenticated delete quick-reply-media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quick-reply-media');
