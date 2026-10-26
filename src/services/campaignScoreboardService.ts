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
  /** Lu's read of the conversation (scripts/detectSales.ts), when it ran on this deal. */
  lu: LuSaleRead | null;
  wonAt: string | null;
  /** deals.owner_id → team_members.id */
  ownerId: string | null;
}

export interface LuSaleRead {
  /** Lu moved this deal to Ganho — the "marcado pela Lu" seal. */
  applied: boolean;
  /** Not sure enough to mark it: worth a human look at the conversation. */
  doubt: boolean;
  evidence: string | null;
}

/** Same default as the script's --min-confidence. */
const LU_MIN_CONFIDENCE = 85;

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
  owner_id: string | null;
  contact: { name: string | null; call_name: string | null; phone_number: string | null } | null;
}

async function fetchDealsCreatedIn(period: Period): Promise<DealRow[]> {
  const rows: DealRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('deals')
      .select('id, contact_id, created_at, value, won_at, lost_at, lost_reason_code, campaign_id, owner_id, contact:contacts(name, call_name, phone_number)')
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
 * Lu's verdicts for these deals. Best effort: before the
 * deal_sale_detections migration is applied the table is missing, and the
 * scoreboard must still load.
 */
async function fetchLuReads(dealIds: string[]): Promise<Map<string, LuSaleRead>> {
  const result = new Map<string, LuSaleRead>();
  for (let i = 0; i < dealIds.length; i += IN_CHUNK) {
    const { data, error } = await (supabase as any)
      .from('deal_sale_detections')
      .select('deal_id, verdict, confidence, evidence, applied_at')
      .in('deal_id', dealIds.slice(i, i + IN_CHUNK));
    if (error) return result;
    for (const row of (data ?? []) as Array<{ deal_id: string; verdict: string; confidence: number; evidence: string | null; applied_at: string | null }>) {
      result.set(row.deal_id, {
        applied: !!row.applied_at,
        doubt: row.verdict === 'unclear' || (row.verdict === 'sold' && row.confidence < LU_MIN_CONFIDENCE),
        evidence: row.evidence,
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
  const [origins, luReads] = await Promise.all([fetchOrigins(contactIds), fetchLuReads(deals.map((d) => d.id))]);

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
      lu: luReads.get(d.id) ?? null,
      wonAt: d.won_at,
      ownerId: d.owner_id,
    });
  }
  return leads;
}

/**
 * Sales CLOSED in the period (by won_at), whenever the lead arrived — the
 * same rule as "Faturamento por campanha" and the one prizes are paid on.
 * The scoreboard above is a cohort view and answers a different question.
 */
export async function fetchCampaignWins(
  period: Period,
  campaignNames: Map<string, string>,
): Promise<CampaignLead[]> {
  const deals: DealRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('deals')
      .select('id, contact_id, created_at, value, won_at, lost_at, lost_reason_code, campaign_id, owner_id, contact:contacts(name, call_name, phone_number)')
      .gte('won_at', period.from.toISOString())
      .lt('won_at', period.to.toISOString())
      .order('won_at', { ascending: false })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    deals.push(...((data ?? []) as unknown as DealRow[]));
    if (!data || data.length < PAGE) break;
  }
  const contactIds = [...new Set(deals.map((d) => d.contact_id).filter((id): id is string => !!id))];
  const [origins, luReads] = await Promise.all([fetchOrigins(contactIds), fetchLuReads(deals.map((d) => d.id))]);

  const wins: CampaignLead[] = [];
  for (const d of deals) {
    const origin = d.contact_id ? origins.get(d.contact_id) : undefined;
    const campaignId = d.campaign_id ?? origin?.campaignId ?? null;
    if (!campaignId) continue;
    wins.push({
      dealId: d.id,
      contactId: d.contact_id,
      contactName: d.contact?.call_name || d.contact?.name || d.contact?.phone_number || 'Contato sem nome',
      phone: d.contact?.phone_number ?? null,
      createdAt: d.created_at ?? '',
      value: d.value ?? 0,
      outcome: 'won',
      lostReasonCode: null,
      campaignId,
      campaignName: campaignNames.get(campaignId) ?? origin?.campaignName ?? null,
      adName: origin?.adName ?? null,
      lu: luReads.get(d.id) ?? null,
      wonAt: d.won_at,
      ownerId: d.owner_id,
    });
  }
  return wins;
}

export interface Attendant {
  /** team_members.id, or null for phone replies on a number with no known owner. */
  memberId: string | null;
  name: string;
  messages: number;
  /** Of `messages`, how many were typed on the phone and credited by number. */
  phoneMessages: number;
  firstAt: string;
  lastAt: string;
}

export interface TeamMemberRef {
  id: string;
  userId: string | null;
  name: string;
  hidden: boolean;
}

export async function fetchTeamMembers(): Promise<TeamMemberRef[]> {
  const { data, error } = await (supabase as any)
    .from('team_members')
    .select('id, user_id, name, hidden');
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; user_id: string | null; name: string; hidden: boolean | null }>)
    .map((m) => ({ id: m.id, userId: m.user_id, name: m.name, hidden: !!m.hidden }));
}

/**
 * Owner of each WhatsApp number. Each attendant works a single number, so a
 * number granted to exactly one visible member is hers; otherwise (admins
 * with several grants, no grants yet) the member who sends the most app
 * replies on it in the last 90 days.
 */
async function fetchInstanceOwners(members: TeamMemberRef[]): Promise<Map<string, TeamMemberRef>> {
  const byUser = new Map(members.filter((m) => m.userId && !m.hidden).map((m) => [m.userId as string, m]));
  const owners = new Map<string, TeamMemberRef>();

  const { data: grants } = await supabase.from('whatsapp_instance_access').select('instance_name, user_id');
  const grantedTo = new Map<string, TeamMemberRef[]>();
  for (const g of grants ?? []) {
    const m = byUser.get(g.user_id);
    if (!m) continue;
    grantedTo.set(g.instance_name, [...(grantedTo.get(g.instance_name) ?? []), m]);
  }
  for (const [instance, list] of grantedTo) if (list.length === 1) owners.set(instance, list[0]);

  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const tally = new Map<string, Map<string, number>>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('messages')
      .select('sent_by, conversation:conversations(metadata)')
      .not('sent_by', 'is', null)
      .gte('sent_at', since)
      .range(offset, offset + PAGE - 1);
    if (error) break;
    for (const row of (data ?? []) as unknown as Array<{ sent_by: string; conversation: { metadata: { instance?: string } | null } | null }>) {
      const instance = row.conversation?.metadata?.instance;
      if (!instance || owners.has(instance) || !byUser.has(row.sent_by)) continue;
      const t = tally.get(instance) ?? new Map<string, number>();
      tally.set(instance, t);
      t.set(row.sent_by, (t.get(row.sent_by) ?? 0) + 1);
    }
    if (!data || data.length < PAGE) break;
  }
  for (const [instance, t] of tally) {
    if (owners.has(instance)) continue;
    const [top] = [...t.entries()].sort((a, b) => b[1] - a[1]);
    if (top) owners.set(instance, byUser.get(top[0]) as TeamMemberRef);
  }
  return owners;
}

/**
 * Who answered each contact, from the human replies in all of its
 * conversations (one per WhatsApp number). Replies typed on the phone carry
 * no sent_by and go to the owner of the number they left from; the hidden
 * maintenance account is skipped.
 */
export async function fetchAttendants(
  contactIds: string[],
  members: TeamMemberRef[],
): Promise<Map<string, Attendant[]>> {
  const byUser = new Map(members.filter((m) => m.userId).map((m) => [m.userId as string, m]));
  const owners = await fetchInstanceOwners(members);
  const contactByConversation = new Map<string, string>();
  const instanceByConversation = new Map<string, string>();
  for (let i = 0; i < contactIds.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, contact_id, metadata')
      .in('contact_id', contactIds.slice(i, i + IN_CHUNK));
    if (error) throw error;
    for (const c of data ?? []) {
      if (c.contact_id) contactByConversation.set(c.id, c.contact_id);
      const instance = (c.metadata as { instance?: string } | null)?.instance;
      if (instance) instanceByConversation.set(c.id, instance);
    }
  }

  const acc = new Map<string, Map<string, Attendant>>();
  const conversationIds = [...contactByConversation.keys()];
  for (let i = 0; i < conversationIds.length; i += IN_CHUNK) {
    const chunk = conversationIds.slice(i, i + IN_CHUNK);
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id, sent_by, sent_at')
        .in('conversation_id', chunk)
        .eq('from_type', 'human')
        .order('sent_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (error) throw error;
      for (const m of data ?? []) {
        const contactId = contactByConversation.get(m.conversation_id);
        if (!contactId) continue;
        const fromPhone = !m.sent_by;
        const instance = instanceByConversation.get(m.conversation_id);
        const member = m.sent_by ? byUser.get(m.sent_by) : instance ? owners.get(instance) : undefined;
        if (member?.hidden) continue;
        const key = member?.id ?? (m.sent_by ? `user:${m.sent_by}` : 'phone');
        const perContact = acc.get(contactId) ?? new Map<string, Attendant>();
        acc.set(contactId, perContact);
        const entry = perContact.get(key);
        if (entry) {
          entry.messages += 1;
          if (fromPhone) entry.phoneMessages += 1;
          if (m.sent_at < entry.firstAt) entry.firstAt = m.sent_at;
          if (m.sent_at > entry.lastAt) entry.lastAt = m.sent_at;
        } else {
          perContact.set(key, {
            memberId: member?.id ?? null,
            name: member?.name ?? (m.sent_by ? 'Ex-integrante' : 'Pelo celular'),
            messages: 1,
            phoneMessages: fromPhone ? 1 : 0,
            firstAt: m.sent_at,
            lastAt: m.sent_at,
          });
        }
      }
      if (!data || data.length < PAGE) break;
    }
  }

  const result = new Map<string, Attendant[]>();
  for (const [contactId, perContact] of acc) {
    result.set(contactId, [...perContact.values()].sort((a, b) => a.firstAt.localeCompare(b.firstAt)));
  }
  return result;
}
