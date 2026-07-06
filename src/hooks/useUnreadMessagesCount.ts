import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Total de mensagens não lidas em todas as conversas (mesma regra usada em
 * transformDBToUIConversation: from_type='user' e status ainda não 'read').
 * Hook dedicado e leve (só COUNT, sem baixar conteúdo) para uso no badge da
 * Sidebar, que fica montada em toda a aplicação — não reaproveita
 * useConversations para não duplicar a busca/realtime pesada dessa tela.
 */
export function useUnreadMessagesCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: total } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('from_type', 'user')
      .in('status', ['sent', 'delivered']);

    setCount(total ?? 0);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('sidebar-unread-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return count;
}
