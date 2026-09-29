import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCampaignNamesByContact, type LeadCampaign } from '@/services/attributionService';

const RETRY_DELAY_MS = 5_000;
const NEW_LEAD_RETRIES = 3;

/**
 * Campaign each contact came from, for the origin badge: the internal campaign
 * (resolved via `campaign_mappings`), or the Meta campaign name while unmapped.
 *
 * Computed on read, never stored on the contact: an attendant editing tags can't
 * remove it, and when a manager maps or fixes a campaign every row follows —
 * the hook refetches on any `campaign_mappings`/`campaigns` change (both are in
 * the realtime publication). Only contacts not asked about yet are fetched as
 * the list grows.
 */
export function useLeadCampaigns(contactIds: string[]): Map<string, LeadCampaign> {
  const [campaigns, setCampaigns] = useState<Map<string, LeadCampaign>>(new Map());
  const [version, setVersion] = useState(0);
  // Refs, not state: the reset and the refetch after a mapping change must see
  // the same generation within one render cycle.
  const asked = useRef(new Set<string>());
  const generation = useRef(0);

  useEffect(() => {
    const reset = () => {
      generation.current += 1;
      asked.current = new Set();
      setCampaigns(new Map());
      setVersion((v) => v + 1);
    };
    const channel = supabase
      .channel(`lead-campaigns-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_mappings' }, reset)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, reset)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // A lead that arrives while the page is open is asked about before the backend
  // finishes cataloging its ad (ensureAdCataloged runs fire-and-forget), so the
  // first answer is empty. Contacts that show up after the initial load get a
  // few delayed retries; the initial list load's misses are just organic leads.
  const primedIn = useRef(-1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const key = contactIds.join(',');
  useEffect(() => {
    const missing = contactIds.filter((id) => !asked.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => asked.current.add(id));
    const requestedIn = generation.current;
    const isInitial = primedIn.current !== requestedIn;
    primedIn.current = requestedIn;

    const load = (ids: string[], retriesLeft: number) => {
      fetchCampaignNamesByContact(ids).then((found) => {
        // A mapping changed while this was in flight: its answer is stale.
        if (requestedIn !== generation.current) return;
        if (found.size > 0) setCampaigns((prev) => new Map([...prev, ...found]));
        const misses = ids.filter((id) => !found.has(id));
        if (misses.length === 0 || retriesLeft === 0) return;
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          load(misses, retriesLeft - 1);
        }, RETRY_DELAY_MS);
        timers.current.add(timer);
      });
    };
    // A handful of ids on first load is the conversation header opening a lead
    // that may have just arrived: retried as well.
    load(missing, isInitial && missing.length > 3 ? 0 : NEW_LEAD_RETRIES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  return campaigns;
}
