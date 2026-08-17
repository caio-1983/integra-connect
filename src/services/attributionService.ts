import { supabase } from '@/integrations/supabase/client';
import type {
  Campaign,
  CampaignMapping,
  CampaignMatchType,
  LeadAttribution,
  LeadSourceKind,
} from '@/types';

/**
 * Lead origin attribution and the editable campaign mapping.
 *
 * The mapping is applied by the `lead_attribution_resolved` view at READ time,
 * not stored on the lead — so adding or fixing a rule re-attributes the entire
 * history immediately, with nothing to reprocess. Every read here goes through
 * that view rather than `contact_attribution` directly.
 */

// ============= Campaigns =============

function toCampaign(row: Record<string, any>): Campaign {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel ?? null,
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    isActive: row.is_active,
    notes: row.notes ?? null,
  };
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('started_at', { ascending: false, nullsFirst: false })
    .order('name');

  if (error) {
    console.error('[attribution] Error fetching campaigns:', error);
    return [];
  }
  return (data ?? []).map(toCampaign);
}

export interface CampaignInput {
  name: string;
  channel?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  notes?: string | null;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data: session } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: input.name.trim(),
      channel: input.channel?.trim() || null,
      started_at: input.startedAt || null,
      ended_at: input.endedAt || null,
      notes: input.notes?.trim() || null,
      created_by: session.session?.user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toCampaign(data);
}

export async function updateCampaign(id: string, patch: Partial<CampaignInput & { isActive: boolean }>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.channel !== undefined) row.channel = patch.channel?.trim() || null;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt || null;
  if (patch.endedAt !== undefined) row.ended_at = patch.endedAt || null;
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null;
  if (patch.isActive !== undefined) row.is_active = patch.isActive;

  const { error } = await supabase.from('campaigns').update(row).eq('id', id);
  if (error) throw error;
}

// ============= Mapping rules =============

function toMapping(row: Record<string, any>): CampaignMapping {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    matchType: row.match_type as CampaignMatchType,
    matchValue: row.match_value,
    priority: row.priority,
  };
}

export async function fetchCampaignMappings(): Promise<CampaignMapping[]> {
  const { data, error } = await supabase
    .from('campaign_mappings')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at');

  if (error) {
    console.error('[attribution] Error fetching campaign mappings:', error);
    return [];
  }
  return (data ?? []).map(toMapping);
}

/**
 * Default priorities encode how specific each signal is. An ad id names one
 * exact creative, so it must beat a WhatsApp number that every campaign on that
 * line shares.
 */
const MATCH_TYPE_PRIORITY: Record<CampaignMatchType, number> = {
  meta_ad_id: 40,
  meta_campaign_name: 30,
  utm_campaign: 30,
  ref_token: 20,
  whatsapp_instance: 10,
};

export async function createCampaignMapping(
  campaignId: string,
  matchType: CampaignMatchType,
  matchValue: string,
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const { error } = await supabase.from('campaign_mappings').insert({
    campaign_id: campaignId,
    match_type: matchType,
    match_value: matchValue.trim(),
    priority: MATCH_TYPE_PRIORITY[matchType],
    created_by: session.session?.user?.id ?? null,
  });

  if (error) {
    // 23505 = unique violation on (match_type, match_value): this raw value is
    // already claimed by another campaign. Surfaced as a human sentence because
    // the fix is a decision, not a retry.
    if ((error as { code?: string }).code === '23505') {
      throw new Error('Esse valor já está mapeado para outra campanha. Remova o mapeamento existente primeiro.');
    }
    throw error;
  }
}

export async function deleteCampaignMapping(id: string): Promise<void> {
  const { error } = await supabase.from('campaign_mappings').delete().eq('id', id);
  if (error) throw error;
}

// ============= Attribution =============

function toAttribution(row: Record<string, any>): LeadAttribution {
  return {
    contactId: row.contact_id,
    sourceChannel: row.source_channel,
    sourceKind: row.source_kind as LeadSourceKind,
    sourceRaw: (row.source_raw ?? {}) as Record<string, string>,
    setManually: row.set_manually ?? false,
    firstSeenAt: row.first_seen_at,
    campaignId: row.campaign_id ?? null,
    campaignName: row.campaign_name ?? null,
    rawCampaignSignal: row.raw_campaign_signal ?? null,
  };
}

export async function fetchLeadAttribution(contactId: string): Promise<LeadAttribution | null> {
  const { data, error } = await supabase
    .from('lead_attribution_resolved')
    .select('*')
    .eq('contact_id', contactId)
    .maybeSingle();

  if (error) {
    console.error('[attribution] Error fetching lead attribution:', error);
    return null;
  }
  return data ? toAttribution(data) : null;
}

export interface ManualAttributionInput {
  sourceChannel: string;
  sourceKind: LeadSourceKind;
  /** Optional campaign override, written as a mapping-independent raw signal. */
  campaignName?: string;
  note?: string;
}

/**
 * Sets or corrects a lead's origin by hand — the only way to attribute organic,
 * referral and offline leads, and the escape hatch when tracking got it wrong.
 *
 * Unlike the backend's first-touch write, this deliberately DOES overwrite: an
 * operator correcting a wrong origin must win over whatever was auto-detected.
 * `set_manually` records that it was a human's call, so reports can tell a
 * measured origin from a stated one.
 */
export async function setManualAttribution(contactId: string, input: ManualAttributionInput): Promise<void> {
  const { data: session } = await supabase.auth.getSession();

  const sourceRaw: Record<string, string> = {};
  if (input.campaignName?.trim()) sourceRaw.meta_campaign_name = input.campaignName.trim();
  if (input.note?.trim()) sourceRaw.note = input.note.trim();

  const { error } = await supabase
    .from('contact_attribution')
    .upsert({
      contact_id: contactId,
      source_channel: input.sourceChannel,
      source_kind: input.sourceKind,
      source_raw: sourceRaw,
      set_manually: true,
      set_by: session.session?.user?.id ?? null,
    }, { onConflict: 'contact_id' });

  if (error) throw error;
}

export interface UnmappedSignal {
  matchType: CampaignMatchType;
  value: string;
  leadCount: number;
}

/**
 * Raw campaign signals that no rule maps yet, most frequent first.
 *
 * This is what closes the loop: without it a manager only ever sees a growing
 * "Não mapeado" bucket with no way to find out what is in it. Each row is one
 * click away from becoming a mapping.
 */
export async function fetchUnmappedSignals(): Promise<UnmappedSignal[]> {
  const { data, error } = await supabase
    .from('lead_attribution_resolved')
    .select('source_raw, campaign_id')
    .is('campaign_id', null);

  if (error) {
    console.error('[attribution] Error fetching unmapped signals:', error);
    return [];
  }

  // Aggregated client-side rather than in SQL because it needs one row per
  // (signal kind, value) pair out of a JSONB column, and the unmapped set is
  // small by nature — it shrinks every time someone maps something.
  const KEY_TO_TYPE: [string, CampaignMatchType][] = [
    ['ad_id', 'meta_ad_id'],
    ['meta_campaign_name', 'meta_campaign_name'],
    ['utm_campaign', 'utm_campaign'],
    ['ref', 'ref_token'],
    ['instance', 'whatsapp_instance'],
  ];

  const counts = new Map<string, UnmappedSignal>();
  for (const row of data ?? []) {
    const raw = (row.source_raw ?? {}) as Record<string, string>;
    for (const [key, matchType] of KEY_TO_TYPE) {
      const value = raw[key];
      if (!value) continue;
      const id = `${matchType}::${value.toLowerCase()}`;
      const existing = counts.get(id);
      if (existing) existing.leadCount += 1;
      else counts.set(id, { matchType, value, leadCount: 1 });
      // Only the most specific signal present is offered, mirroring how the
      // view's priority ordering would resolve it — otherwise mapping the
      // WhatsApp number would silently shadow the ad id.
      break;
    }
  }

  return [...counts.values()].sort((a, b) => b.leadCount - a.leadCount);
}
