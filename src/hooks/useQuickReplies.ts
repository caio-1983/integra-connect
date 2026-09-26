import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuickReply {
  id: string;
  /** Lowercase, no slash — typed as `/shortcut` in the composer. */
  shortcut: string;
  message: string;
}

// quick_replies is newer than the generated Supabase types.
const table = () => (supabase as any).from('quick_replies');

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

/** Company-wide quick replies, kept live via realtime. */
export function useQuickReplies() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await table().select('id, shortcut, message').order('shortcut');
    if (error) console.error('[useQuickReplies] fetch failed:', error);
    setQuickReplies((data as QuickReply[] | null) ?? []);
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

  const save = useCallback(async (reply: { id?: string; shortcut: string; message: string }) => {
    const row = { shortcut: normalizeShortcut(reply.shortcut), message: reply.message.trim() };
    const { error } = reply.id
      ? await table().update(row).eq('id', reply.id)
      : await table().insert(row);
    if (error) {
      if (error.code === '23505') throw new Error(`O atalho /${row.shortcut} já existe.`);
      throw new Error(error.message);
    }
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    const { error } = await table().delete().eq('id', id);
    if (error) throw new Error(error.message);
    await refetch();
  }, [refetch]);

  return { quickReplies, loading, save, remove };
}
