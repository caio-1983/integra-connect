import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';

/**
 * The agent responsible for each WhatsApp instance (may re-pair it by QR), as
 * a { instanceName -> user_id } map. Mirrors useInstanceLabels: refreshed live
 * via realtime (see whatsapp_instance_responsibles migration).
 */
export function useInstanceResponsibles() {
  const [responsibles, setResponsibles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setResponsibles(await api.fetchInstanceResponsibles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('whatsapp-instance-responsibles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instance_responsibles' }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { responsibles, loading, refresh };
}
