import { getSupabase } from './supabaseClient.js';
import { MEDIA_PLACEHOLDER } from '../channels/mediaPlaceholder.js';
import type { IncomingMessage } from '../types/index.js';

const PAGE = 1000; // PostgREST caps each response at 1000 rows
const CHUNK = 150; // keeps `.in(...)` URLs well under the gateway limit

export interface CampaignLeadDeal {
  dealId: string;
  contactId: string;
  contactName: string | null;
  campaignName: string;
}

export interface TranscriptLine {
  fromType: IncomingMessage['fromType'];
  sentAt: string;
  text: string;
}

export type SaleVerdict = 'sold' | 'not_sold' | 'unclear';

export interface SaleDetection {
  dealId: string;
  contactId: string;
  verdict: SaleVerdict;
  confidence: number;
  evidence: string | null;
  value: number | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  appliedAt: string | null;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

/** Data access for the Lu "did this lead buy?" pass (scripts/detectSales.ts). */
export const saleDetectionRepository = {
  /**
   * Contacts with a conversation created in [since, until) whose origin resolves
   * to a campaign, paired with their open deal (most recent one if several).
   * Contacts whose deals are all won or lost are left out — nothing to decide.
   */
  async listCampaignLeadsWithOpenDeal(sinceIso: string, untilIso: string): Promise<CampaignLeadDeal[]> {
    const supabase = getSupabase();

    const contactIds = new Set<string>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('conversations')
        .select('contact_id')
        .gte('created_at', sinceIso)
        .lt('created_at', untilIso)
        .order('id')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`[sale-detection] failed to list conversations: ${error.message}`);
      for (const row of data ?? []) if (row.contact_id) contactIds.add(row.contact_id);
      if (!data || data.length < PAGE) break;
    }

    const campaignByContact = new Map<string, string>();
    for (const ids of chunks([...contactIds])) {
      const { data, error } = await supabase
        .from('lead_attribution_resolved')
        .select('contact_id, campaign_name')
        .in('contact_id', ids)
        .not('campaign_name', 'is', null);
      if (error) throw new Error(`[sale-detection] failed to read attribution: ${error.message}`);
      for (const row of data ?? []) campaignByContact.set(row.contact_id, row.campaign_name);
    }

    const leads: CampaignLeadDeal[] = [];
    for (const ids of chunks([...campaignByContact.keys()])) {
      const { data, error } = await supabase
        .from('deals')
        .select('id, contact_id, created_at, contact:contacts(name, call_name)')
        .in('contact_id', ids)
        .is('won_at', null)
        .is('lost_at', null)
        .order('created_at', { ascending: false });
      if (error) throw new Error(`[sale-detection] failed to read deals: ${error.message}`);
      const seen = new Set<string>();
      for (const row of data ?? []) {
        if (seen.has(row.contact_id)) continue; // newest first → keep the most recent open deal
        seen.add(row.contact_id);
        const contact = row.contact as unknown as { name?: string | null; call_name?: string | null } | null;
        leads.push({
          dealId: row.id,
          contactId: row.contact_id,
          contactName: contact?.name || contact?.call_name || null,
          campaignName: campaignByContact.get(row.contact_id)!,
        });
      }
    }
    return leads;
  },

  /**
   * Every message of the contact since `sinceIso`, across all its conversations
   * (one per WhatsApp number), chronological. Voice notes use their transcript;
   * media without caption keeps the placeholder — a "📷 Imagem" right after the
   * Pix key is often the receipt.
   */
  async getContactTranscript(contactId: string, sinceIso: string, limit = 300): Promise<TranscriptLine[]> {
    const supabase = getSupabase();
    const { data: convs, error: convError } = await supabase.from('conversations').select('id').eq('contact_id', contactId);
    if (convError) throw new Error(`[sale-detection] failed to list contact conversations: ${convError.message}`);
    const conversationIds = (convs ?? []).map((c) => c.id);
    if (conversationIds.length === 0) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('content, from_type, type, transcription, transcription_status, sent_at')
      .in('conversation_id', conversationIds)
      .gte('sent_at', sinceIso)
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`[sale-detection] failed to read messages: ${error.message}`);

    return (data ?? [])
      .reverse()
      .map((m) => {
        const transcript = m.transcription_status === 'done' && m.transcription ? `🎤 (áudio transcrito) ${m.transcription}` : null;
        const placeholder = MEDIA_PLACEHOLDER[m.type as keyof typeof MEDIA_PLACEHOLDER] ?? null;
        const text = transcript ?? (m.content || placeholder || '');
        return { fromType: m.from_type as IncomingMessage['fromType'], sentAt: m.sent_at as string, text };
      })
      .filter((line) => line.text.length > 0);
  },

  /** The system "Ganho" stage — same lookup as the frontend's getSystemStageIds. */
  async getGanhoStageId(): Promise<string> {
    const { data, error } = await getSupabase()
      .from('pipeline_stages')
      .select('id, title')
      .eq('is_system', true)
      .eq('is_active', true);
    if (error) throw new Error(`[sale-detection] failed to read stages: ${error.message}`);
    const ganho = (data ?? []).find((s) => s.title.toLowerCase() === 'ganho');
    if (!ganho) throw new Error('[sale-detection] stage "Ganho" not found');
    return ganho.id;
  },

  async getDetections(dealIds: string[]): Promise<Map<string, SaleDetection>> {
    const supabase = getSupabase();
    const byDeal = new Map<string, SaleDetection>();
    for (const ids of chunks(dealIds)) {
      const { data, error } = await supabase
        .from('deal_sale_detections')
        .select('deal_id, contact_id, verdict, confidence, evidence, value, model, input_tokens, output_tokens, applied_at')
        .in('deal_id', ids);
      if (error) throw new Error(`[sale-detection] failed to read detections: ${error.message}`);
      for (const r of data ?? []) {
        byDeal.set(r.deal_id, {
          dealId: r.deal_id,
          contactId: r.contact_id,
          verdict: r.verdict as SaleVerdict,
          confidence: r.confidence,
          evidence: r.evidence,
          value: r.value === null ? null : Number(r.value),
          model: r.model,
          inputTokens: r.input_tokens,
          outputTokens: r.output_tokens,
          appliedAt: r.applied_at,
        });
      }
    }
    return byDeal;
  },

  async saveDetection(d: SaleDetection): Promise<void> {
    const { error } = await getSupabase().from('deal_sale_detections').upsert({
      deal_id: d.dealId,
      contact_id: d.contactId,
      verdict: d.verdict,
      confidence: d.confidence,
      evidence: d.evidence,
      value: d.value,
      model: d.model,
      input_tokens: d.inputTokens,
      output_tokens: d.outputTokens,
      applied_at: d.appliedAt,
    }, { onConflict: 'deal_id' });
    if (error) throw new Error(`[sale-detection] failed to save detection: ${error.message}`);
  },

  /**
   * Moves the deal to Ganho — the same write as the frontend's markDealWon.
   * Only while the deal is still open, so a card someone already closed by hand
   * is never overwritten. Keeps the current value when Lu found none.
   * Returns true when the deal was moved.
   */
  async markWonIfOpen(dealId: string, ganhoStageId: string, value: number | null): Promise<boolean> {
    const supabase = getSupabase();
    const update: Record<string, unknown> = { stage: 'won', stage_id: ganhoStageId, won_at: new Date().toISOString() };
    if (value !== null && value > 0) update.value = value;

    const { data, error } = await supabase
      .from('deals')
      .update(update)
      .eq('id', dealId)
      .is('won_at', null)
      .is('lost_at', null)
      .select('id');
    if (error) throw new Error(`[sale-detection] failed to mark deal won: ${error.message}`);
    if (!data || data.length === 0) return false;

    const { error: stampError } = await supabase
      .from('deal_sale_detections')
      .update({ applied_at: new Date().toISOString() })
      .eq('deal_id', dealId);
    if (stampError) throw new Error(`[sale-detection] deal won but applied_at not stamped: ${stampError.message}`);
    return true;
  },
};
