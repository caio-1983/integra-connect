import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';

/**
 * Who (by auth.users.id) has been granted access to which WhatsApp instance.
 * Backs both the admin "Acesso" panel per instance and the eligible-transfer
 * filtering in ChatInterface — a single source of truth for both, refreshed
 * live via realtime (the table is added to `supabase_realtime`, see
 * whatsapp_instance_access migration).
 */
export function useInstanceAccessGrants() {
  const [grantsByInstance, setGrantsByInstance] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const grants = await api.fetchInstanceAccess();
      const map = new Map<string, Set<string>>();
      for (const grant of grants) {
        if (!map.has(grant.instance_name)) map.set(grant.instance_name, new Set());
        map.get(grant.instance_name)!.add(grant.user_id);
      }
      setGrantsByInstance(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('whatsapp-instance-access-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instance_access' }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { grantsByInstance, loading, refresh };
}
