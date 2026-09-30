import { supabase } from '@/integrations/supabase/client';
import type { Period } from '@/services/analyticsService';

/**
 * Per-lead rows behind the Campanhas scoreboard: who came in through which
 * campaign, and what happened to them.
 *
 * This is a COHORT view, unlike `report_campaign_performance`: it takes the leads
 * that arrived in the period and follows each one to its current outcome. That is
 * the question "is this campaign worth keeping?" asks — a sale in September from
 * an August lead belongs to August's campaign result.
 *
 * Deals are paged past the 1000-row cap on purpose (see the header of
 * 20260810100500_report_functions.sql): a silently truncated list would make a
 * campaign look worse than it is.
 */

export type LeadOutcome = 'won' | 'open' | 'lost';

export interface CampaignLead {
  dealId: string;
  contactId: string | null;
  contactName: string;
  phone: string | null;
  createdAt: string;
  value: number;
  outcome: LeadOutcome;
  lostReasonCode: string | null;
  /** Null = the lead's signal matches no campaign rule (shows up as "sem campanha"). */
  campaignId: string | null;
  campaignName: string | null;
  /** Ad the lead clicked, when known: catalog name first, then the ad headline. */
  adName: string | null;
}

const PAGE = 1000;
const IN_CHUNK = 150;

interface DealRow {
  id: string;
  contact_id: string | null;
  created_at: string | null;
  value: number | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason_code: string | null;
  campaign_id: string | null;
  contact: { name: string | null; call_name: string | null; phone_number: string | null } | null;
}

async function fetchDealsCreatedIn(period: Period): Promise<DealRow[]> {
  const rows: DealRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('deals')
      .select('id, contact_id, created_at, value, won_at, lost_at, lost_reason_code, campaign_id, contact:contacts(name, call_name, phone_number)')
      .gte('created_at', period.from.toISOString())
      .lt('created_at', period.to.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as DealRow[]));
    if (!data || data.length < PAGE) return rows;
  }
}

interface ResolvedOrigin {
  campaignId: string | null;
  campaignName: string | null;
  adName: string | null;
  /** Carries a campaign-type signal (ad, Meta campaign, UTM, ref). The WhatsApp
   *  number alone does not count: every lead has one, organic included. */
  hasCampaignSignal: boolean;
}

const CAMPAIGN_SIGNAL_KEYS = ['ad_id', 'meta_campaign_name', 'utm_campaign', 'ref'];

async function fetchOrigins(contactIds: string[]): Promise<Map<string, ResolvedOrigin>> {
  const result = new Map<string, ResolvedOrigin>();
  for (let i = 0; i < contactIds.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from('lead_attribution_resolved')
      .select('contact_id, campaign_id, campaign_name, catalog_ad_name, catalog_campaign_name, source_raw')
      .in('contact_id', contactIds.slice(i, i + IN_CHUNK));
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.contact_id) continue;
      const raw = (row.source_raw ?? {}) as Record<string, string>;
      result.set(row.contact_id, {
        campaignId: row.campaign_id ?? null,
        campaignName: row.campaign_name ?? null,
        adName: row.catalog_ad_name ?? raw.ad_title ?? null,
        hasCampaignSignal: !!row.catalog_campaign_name || CAMPAIGN_SIGNAL_KEYS.some((k) => !!raw[k]),
      });
    }
  }
  return result;
}

/**
 * Leads created in the period that came from a campaign — mapped, or carrying a
 * campaign signal no rule maps yet. Organic and untracked leads are left out:
 * they are not any campaign's result.
 */
export async function fetchCampaignLeads(
  period: Period,
  campaignNames: Map<string, string>,
): Promise<CampaignLead[]> {
  const deals = await fetchDealsCreatedIn(period);
  const contactIds = [...new Set(deals.map((d) => d.contact_id).filter((id): id is string => !!id))];
  const origins = await fetchOrigins(contactIds);

  const leads: CampaignLead[] = [];
  for (const d of deals) {
    const origin = d.contact_id ? origins.get(d.contact_id) : undefined;
    // Same convention as the report functions: a per-deal override wins over
    // the contact's first-touch origin.
    const campaignId = d.campaign_id ?? origin?.campaignId ?? null;
    if (!campaignId && !origin?.hasCampaignSignal) continue;

    leads.push({
      dealId: d.id,
      contactId: d.contact_id,
      contactName: d.contact?.call_name || d.contact?.name || d.contact?.phone_number || 'Contato sem nome',
      phone: d.contact?.phone_number ?? null,
      createdAt: d.created_at ?? '',
      value: d.value ?? 0,
      outcome: d.won_at ? 'won' : d.lost_at ? 'lost' : 'open',
      lostReasonCode: d.lost_reason_code,
      campaignId,
      campaignName: campaignId ? (campaignNames.get(campaignId) ?? origin?.campaignName ?? null) : null,
      adName: origin?.adName ?? null,
    });
  }
  return leads;
}
