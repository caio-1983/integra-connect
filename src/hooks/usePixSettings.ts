import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePixKey, validatePixKey, type PixKeyType } from '@/lib/pix';

/** The company's Pix key from Configurações — one row for the whole company. */
export interface PixSettings {
  merchantName: string;
  keyType: PixKeyType;
  /** Normalized (see normalizePixKey). */
  key: string;
}

interface PixSettingsRow { merchant_name: string; key_type: PixKeyType; pix_key: string }

// pix_settings is newer than the generated Supabase types.
const table = () => (supabase as any).from('pix_settings');

/** The registered Pix key (null until someone registers one), kept live via realtime. */
export function usePixSettings() {
  const [pixSettings, setPixSettings] = useState<PixSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await table().select('merchant_name, key_type, pix_key').eq('id', true).maybeSingle();
    if (error) console.error('[usePixSettings] fetch failed:', error);
    const row = data as PixSettingsRow | null;
    setPixSettings(row ? { merchantName: row.merchant_name, keyType: row.key_type, key: row.pix_key } : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel('pix-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix_settings' }, () => { refetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  /** Normalizes and validates before writing; throws a user-facing message. */
  const save = useCallback(async (input: { merchantName: string; keyType: PixKeyType; key: string }) => {
    const merchantName = input.merchantName.trim();
    if (!merchantName) throw new Error('Informe a razão social.');
    const key = normalizePixKey(input.keyType, input.key);
    const invalid = validatePixKey(input.keyType, key);
    if (invalid) throw new Error(invalid);

    const { data: auth } = await supabase.auth.getUser();
    const { error } = await table().upsert({
      id: true,
      merchant_name: merchantName,
      key_type: input.keyType,
      pix_key: key,
      updated_by: auth.user?.id ?? null,
    });
    if (error) throw new Error(error.message);
    await refetch();
  }, [refetch]);

  return { pixSettings, loading, save };
}
