import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuickReply {
  id: string;
  /** Lowercase, no slash — typed as `/shortcut` in the composer. */
  shortcut: string;
  /** May be empty when the reply is just an image. */
  message: string;
  /** Public URL of the attached image, sent with `message` as caption. */
  imageUrl: string | null;
}

interface QuickReplyRow { id: string; shortcut: string; message: string; image_path: string | null }

export const QUICK_REPLY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const QUICK_REPLY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const BUCKET = 'quick-reply-media';

// quick_replies is newer than the generated Supabase types.
const table = () => (supabase as any).from('quick_replies');

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

/** Storage path back from a public URL built by `publicUrl`. */
const pathFromUrl = (url: string) => url.split(`/${BUCKET}/`)[1] ?? null;

const removeImage = async (path: string | null) => {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('[useQuickReplies] image cleanup failed:', error);
};

/** Normalizes what the user typed into the stored shortcut form. */
export function normalizeShortcut(raw: string): string {
  return raw
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 30);
}

/** Downloads a quick reply's image as a File the composer can attach. */
export async function fetchQuickReplyImage(reply: QuickReply): Promise<File> {
  if (!reply.imageUrl) throw new Error('Resposta rápida sem imagem.');
  const res = await fetch(reply.imageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const name = reply.imageUrl.split('/').pop() || `${reply.shortcut}.jpg`;
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

/** Company-wide quick replies, kept live via realtime. */
export function useQuickReplies() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await table().select('id, shortcut, message, image_path').order('shortcut');
    if (error) console.error('[useQuickReplies] fetch failed:', error);
    setQuickReplies(((data as QuickReplyRow[] | null) ?? []).map((row) => ({
      id: row.id,
      shortcut: row.shortcut,
      message: row.message,
      imageUrl: row.image_path ? publicUrl(row.image_path) : null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel('quick-replies-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_replies' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  /**
   * `image`: a File uploads/replaces the image, null removes it, undefined
   * keeps whatever the reply already has.
   */
  const save = useCallback(async (
    reply: { id?: string; shortcut: string; message: string; imageUrl?: string | null },
    image?: File | null,
  ) => {
    const previousPath = reply.imageUrl ? pathFromUrl(reply.imageUrl) : null;
    let imagePath = previousPath;

    if (image) {
      const ext = image.name.split('.').pop()?.toLowerCase() || 'jpg';
      imagePath = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(imagePath, image, { contentType: image.type });
      if (error) throw new Error(`Falha ao enviar a imagem: ${error.message}`);
    } else if (image === null) {
      imagePath = null;
    }

    const row = { shortcut: normalizeShortcut(reply.shortcut), message: reply.message.trim(), image_path: imagePath };
    const { error } = reply.id
      ? await table().update(row).eq('id', reply.id)
      : await table().insert(row);
    if (error) {
      if (image) await removeImage(imagePath); // don't orphan the upload
      if (error.code === '23505') throw new Error(`O atalho /${row.shortcut} já existe.`);
      throw new Error(error.message);
    }
    if (previousPath && previousPath !== imagePath) await removeImage(previousPath);
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (reply: QuickReply) => {
    const { error } = await table().delete().eq('id', reply.id);
    if (error) throw new Error(error.message);
    if (reply.imageUrl) await removeImage(pathFromUrl(reply.imageUrl));
    await refetch();
  }, [refetch]);

  return { quickReplies, loading, save, remove };
}
