import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';

/**
 * Custom display labels (renames) per WhatsApp instance, as a
 * { instanceName -> label } map. Mirrors useInstanceAccessGrants: single source
 * of truth for the connection cards, refreshed live via realtime (the table is
 * added to `supabase_realtime`, see whatsapp_instance_labels migration).
 */
export function useInstanceLabels() {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLabels(await api.fetchInstanceLabels());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('whatsapp-instance-labels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instance_labels' }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { labels, loading, refresh };
}
