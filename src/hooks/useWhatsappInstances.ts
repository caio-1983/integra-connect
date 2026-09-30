import { useCallback, useEffect, useRef, useState } from 'react';
import type { WhatsappInstanceSummary } from '@/types';
import { listWhatsappInstances } from '@/services/whatsappConnectionService';

const POLL_MS = 10000;

/**
 * Owns the WhatsApp instance list + auto-refresh (Sprint 012). Plain
 * `setInterval` polling while the page is open — no websocket, per spec.
 */
export function useWhatsappInstances() {
  const [instances, setInstances] = useState<WhatsappInstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | undefined>();
  // Last attempt failed (backend down/unreachable). The previous list is kept,
  // but callers must not read an empty list as "no numbers connected".
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listWhatsappInstances();
      setInstances(list);
      setLastFetchedAt(new Date());
      setError(null);
    } catch (error) {
      console.error('[whatsapp] falha ao listar instâncias', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  return { instances, loading, lastFetchedAt, error, refresh };
}
