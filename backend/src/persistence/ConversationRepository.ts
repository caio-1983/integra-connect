import type { ConversationMode, IncomingMessage, MessageDeliveryStatus } from '../types/index.js';
import type { InboundAttribution, InboundMedia } from '../channels/channelEvents.js';
import type { PixDetails, PixKeyType, PixMessageMeta } from '../channels/pix.js';
import { getSupabase } from './supabaseClient.js';
import { logger } from '../logger/Logger.js';
import { configService } from '../config/ConfigService.js';

// Reuses the existing public `audio-messages` bucket for ALL inbound media
// (audio/image/video/document) — it's already public and provisioned, so no new
// bucket or migration is needed. The name is historical; treat it as the shared
// inbound-media bucket.
const MEDIA_BUCKET = 'audio-messages';

/** Postgres unique_violation — a concurrent insert of the same row won. */
const UNIQUE_VIOLATION = '23505';

/** One `meta_ad_catalog` row as the Marketing API lookup produces it. */
export interface MetaAdCatalogRow {
  ad_id: string;
  ad_name: string | null;
  ad_status: string | null;
  adset_id: string | null;
  adset_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_account_id: string | null;
  lookup_error: string | null;
}

/** Operator display names, cached per reply (see getOperatorName). Short TTL so a
 *  rename in the team screen reaches outgoing signatures without a restart. */
const OPERATOR_NAME_TTL_MS = 10 * 60 * 1000;
const operatorNameCache = new Map<string, { name?: string; expiresAt: number }>();

/** File extension for a stored media blob, from its mimetype (falls back to the
 *  document's own file name extension, then 'bin'). */
function mediaExtension(mimeType: string, fileName?: string): string {
  const mt = mimeType.toLowerCase();
  // audio
  if (mt.includes('ogg')) return 'ogg';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('wav')) return 'wav';
  if (mt.includes('m4a')) return 'm4a';
  // image
  if (mt.includes('jpeg') || mt.includes('jpg')) return 'jpg';
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  if (mt.includes('gif')) return 'gif';
  // video (checked after audio/mp3 so audio 'mpeg' wins; 'mp4' can be either —
  // callers pass the right mimetype per kind, and mp4 as a container is fine as .mp4)
  if (mt.includes('mp4')) return 'mp4';
  if (mt.includes('3gpp') || mt.includes('3gp')) return '3gp';
  if (mt.includes('quicktime') || mt.includes('mov')) return 'mov';
  // document
  if (mt.includes('pdf')) return 'pdf';
  const fromName = fileName?.includes('.') ? fileName.split('.').pop() : undefined;
  return (fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'bin');
}

/** Maps our media kind to the DB `messages.type` literal. */
function mediaKindToDbType(kind: InboundMedia['kind']): 'audio' | 'image' | 'video' | 'document' {
  switch (kind) {
    case 'audio': return 'audio';
    case 'image':
    case 'sticker': return 'image';
    case 'video': return 'video';
    case 'document': return 'document';
  }
}

/**
 * The single owner of all Supabase access (Ajuste 1). Every persistence
 * concern — contacts, conversations, messages, status/mode, timeline — passes
 * through here, and this is the ONLY place the DB's `conversation_status`
 * literals ('nina'|'human'|'paused') appear (Ajuste 3). Reused as-is by future
 * channels (Instagram/Telegram/Messenger/Webchat).
 *
 * Write shapes mirror the existing `whatsapp-webhook` Edge Function so rows
 * are indistinguishable from the legacy Meta path and the frontend realtime
 * renders them with no changes.
 */

type DbStatus = 'nina' | 'human' | 'paused';

function statusToMode(status: DbStatus): ConversationMode {
  switch (status) {
    case 'nina': return 'autonomous';
    case 'human': return 'human_only';
    case 'paused': return 'paused';
  }
}

function modeToStatus(mode: ConversationMode): DbStatus {
  switch (mode) {
    case 'autonomous': return 'nina';
    case 'paused': return 'paused';
    // 'copilot' is a frontend AgentSession concept — a human is on the conversation, so it maps to 'human'.
    case 'human_only':
    case 'copilot':
      return 'human';
  }
}

/** Whether new conversations may start in AI mode. Off until the AI agent goes live. */
function aiAutostart(): boolean {
  return (configService.get('AI_AUTOSTART') ?? '').toLowerCase() === 'true';
}

export interface FindOrCreateContactResult {
  contactId: string;
  /** When the profile picture was last fetched (null = never) — see ContactAvatarService. */
  avatarCheckedAt: string | null;
}
/** A 1:1 WhatsApp contact whose picture is missing or stale, with an instance that can look it up. */
export interface AvatarRefreshCandidate { contactId: string; phone: string; instance: string; }
export interface FindOrCreateConversationResult { conversationId: string; created: boolean; }
/** Resolved routing target for an outbound message on an existing conversation. */
export interface ConversationChannelInfo { provider: string; channel: string; instance: string; to: string; }
export interface InsertMessageResult { inserted: boolean; }
export interface EditableMessage {
  id: string;
  providerMessageId: string | null;
  fromType: string;
  sentBy: string | null;
  sentAt: string;
  type: string;
  mediaUrl: string | null;
  content: string;
  metadata: Record<string, unknown>;
}
export interface ImportContactInput { phoneNumber: string; name?: string | null; profilePictureUrl?: string | null; }
export interface BulkImportContactsResult { imported: number; updated: number; }

class ConversationRepository {
  /** A contact is keyed on (channel, external_id) — see migration
   * 20260810100000_channel_identity. `externalId` is the phone digits on
   * WhatsApp, a PSID on Messenger, an IGSID on Instagram; `phone_number` is
   * only populated for WhatsApp, where it is still the routing address
   * Evolution expects. The same human on two channels is intentionally two
   * contacts (no identity unification in this phase).
   *
   * `isGroup` also refreshes `name` on every message for an existing contact
   * — the group's subject can change and is re-resolved per message
   * (EvolutionChannelConnector), so this lets a rename self-heal. Individual
   * contacts intentionally keep their name frozen after creation, so a
   * WhatsApp pushName change (or a manual CRM edit) is never clobbered. */
  async findOrCreateContact(channel: string, externalId: string, pushName?: string, isGroup?: boolean): Promise<FindOrCreateContactResult> {
    const supabase = getSupabase();
    const isWhatsapp = channel === 'whatsapp';
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, profile_picture_checked_at')
      .eq('channel', channel)
      .eq('external_id', externalId)
      .maybeSingle();

    if (existing) {
      const update: Record<string, unknown> = { last_activity: new Date().toISOString() };
      if (isGroup && pushName) {
        update.name = pushName;
        update.call_name = pushName;
      }
      await supabase.from('contacts').update(update).eq('id', existing.id);
      return { contactId: existing.id, avatarCheckedAt: existing.profile_picture_checked_at ?? null };
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        channel,
        external_id: externalId,
        phone_number: isWhatsapp ? externalId : null,
        whatsapp_id: isWhatsapp ? externalId : null,
        name: pushName ?? null,
        call_name: pushName?.split(' ')[0] ?? null,
        user_id: null,
      })
      .select('id')
      .single();

    // Same race as findOrCreateConversation, on contacts_channel_external_id_unique.
    if (error?.code === UNIQUE_VIOLATION) {
      const { data: winner } = await supabase
        .from('contacts')
        .select('id, profile_picture_checked_at')
        .eq('channel', channel)
        .eq('external_id', externalId)
        .maybeSingle();
      if (winner) return { contactId: winner.id, avatarCheckedAt: winner.profile_picture_checked_at ?? null };
    }
    if (error || !data) throw new Error(`[repo] failed to create contact: ${error?.message}`);
    return { contactId: data.id, avatarCheckedAt: null };
  }

  /** Stores a contact's picture (already copied to our storage), or just marks
   * it checked when WhatsApp returned none — the picture already on file is
   * kept then, since a hidden photo doesn't mean the old one is wrong. */
  async setContactAvatar(contactId: string, publicUrl: string | null): Promise<void> {
    const update: Record<string, unknown> = { profile_picture_checked_at: new Date().toISOString() };
    if (publicUrl) update.profile_picture_url = publicUrl;
    const { error } = await getSupabase().from('contacts').update(update).eq('id', contactId);
    if (error) throw new Error(`[repo] failed to set contact avatar: ${error.message}`);
  }

  /** Uploads a contact picture to the public `contact-avatars` bucket. The
   * returned URL carries a version param so a refreshed picture at the same
   * path isn't served stale from the CDN. */
  async uploadContactAvatar(contactId: string, image: Buffer, contentType: string): Promise<string> {
    const supabase = getSupabase();
    const path = `${contactId}.jpg`;
    const { error } = await supabase.storage.from('contact-avatars').upload(path, image, { contentType, upsert: true });
    if (error) throw new Error(`[repo] failed to upload contact avatar: ${error.message}`);
    return `${supabase.storage.from('contact-avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  }

  /** WhatsApp 1:1 contacts with a conversation whose picture was never checked
   * or is older than `staleBefore`, paired with the instance of their latest
   * conversation (a picture lookup needs a connected number). For the backfill. */
  async listAvatarRefreshCandidates(staleBefore: string): Promise<AvatarRefreshCandidate[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('conversations')
      .select('metadata, last_message_at, contacts!inner(id, external_id, channel, profile_picture_checked_at)')
      .eq('contacts.channel', 'whatsapp')
      .or(`profile_picture_checked_at.is.null,profile_picture_checked_at.lt.${staleBefore}`, { referencedTable: 'contacts' })
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(`[repo] failed to list avatar candidates: ${error.message}`);

    const byContact = new Map<string, AvatarRefreshCandidate>();
    for (const row of data ?? []) {
      const contact = row.contacts as unknown as { id: string; external_id: string };
      const instance = (row.metadata as { instance?: string } | null)?.instance;
      if (!instance || !contact?.external_id || contact.external_id.includes('@')) continue; // groups/@lid
      if (!byContact.has(contact.id)) byContact.set(contact.id, { contactId: contact.id, phone: contact.external_id, instance });
    }
    return [...byContact.values()];
  }

  /** `instance` is persisted on `conversations.metadata` at creation time —
   * it's the only record we keep of which Evolution instance owns this
   * conversation, needed later to route a human operator's manual reply
   * (see getConversationChannelInfo). There is no separate instances table.
   *
   * Group conversations default to `status: 'human'` (never 'nina') so the AI
   * doesn't auto-reply from the moment the group thread is created — belt and
   * suspenders alongside ConversationService's hard isGroup guard, which is
   * what actually prevents it even if someone later flips the mode.
   *
   * Every other conversation also starts as 'human' unless AI_AUTOSTART=true:
   * the AI agent isn't live yet, so nothing should open in AI mode. */
  async findOrCreateConversation(
    contactId: string,
    instance: string,
    /** `humanHandled`: a person is already talking on this thread (an echo from
     *  the phone), so it must not start in AI mode like a customer-opened one. */
    opts: { channel: string; provider: string; isGroup?: boolean; humanHandled?: boolean },
  ): Promise<FindOrCreateConversationResult> {
    const supabase = getSupabase();
    const { isGroup, channel, provider, humanHandled } = opts;
    const existingId = await this.findActiveConversationForInstance(contactId, instance);
    if (existingId) return { conversationId: existingId, created: false };

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        contact_id: contactId,
        status: isGroup || humanHandled || !aiAutostart() ? 'human' : 'nina',
        is_active: true,
        user_id: null,
        channel,
        provider,
        // `channel`/`provider` are also kept on metadata so the shape stays
        // backward-compatible with anything already reading metadata.instance.
        metadata: isGroup ? { instance, channel, provider, isGroup: true } : { instance, channel, provider },
      })
      .select('id')
      .single();

    // Lost the race to a simultaneous message from the same contact (e.g. the
    // WhatsApp Business greeting echo 1 s after the customer's first message):
    // conversations_one_active_per_contact_instance rejected the duplicate, so
    // adopt the thread the other message just created.
    if (error?.code === UNIQUE_VIOLATION) {
      const winnerId = await this.findActiveConversationForInstance(contactId, instance);
      if (winnerId) return { conversationId: winnerId, created: false };
    }
    if (error || !data) throw new Error(`[repo] failed to create conversation: ${error?.message}`);
    return { conversationId: data.id, created: true };
  }

  /**
   * Read-only lookup of an already-existing active conversation for a contact
   * address. The outbound echo path tries this first and only falls back to
   * creating the thread (never a lead) for a 1:1 chat — see onOutboundEcho.
   */
  async findActiveConversationByAddress(channel: string, externalId: string, instance: string): Promise<string | null> {
    const supabase = getSupabase();
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('channel', channel)
      .eq('external_id', externalId)
      .maybeSingle();
    if (!contact) return null;

    return this.findActiveConversationForInstance(contact.id, instance);
  }

  /**
   * The active conversation between a contact and ONE of our numbers. A contact
   * is shared across numbers (contacts is keyed on channel + external_id), so
   * matching on contact alone merged a customer's messages to a second number
   * into the thread of the first — and replies then left from the first number.
   * Legacy rows with no recorded instance are still adopted, as before.
   */
  async findActiveConversationForInstance(contactId: string, instance: string): Promise<string | null> {
    const supabase = getSupabase();
    const { data: sameInstance } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .eq('metadata->>instance', instance)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sameInstance) return sameInstance.id;

    const { data: legacy } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .is('metadata->>instance', null)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return legacy?.id ?? null;
  }

  /** Resolves provider + channel + account instance + recipient address for a
   * conversation, so a manual operator reply (no fresh inbound event to read
   * this from) can still be routed correctly. The recipient comes from
   * `contacts.external_id` — phone digits on WhatsApp, PSID/IGSID on Meta —
   * which is what every connector's send API takes. Returns null if the
   * conversation predates instance tracking, or has no contact.
   *
   * `channel`/`provider` fall back to whatsapp/evolution for rows written
   * before 20260810100000, which is what they were. */
  async getConversationChannelInfo(conversationId: string): Promise<ConversationChannelInfo | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('conversations')
      .select('metadata, channel, provider, contacts(external_id)')
      .eq('id', conversationId)
      .maybeSingle();

    const instance = (data?.metadata as { instance?: string } | null)?.instance;
    const to = (data?.contacts as unknown as { external_id?: string } | null)?.external_id;
    if (!instance || !to) return null;
    return {
      provider: (data?.provider as string | null) ?? 'evolution',
      channel: (data?.channel as string | null) ?? 'whatsapp',
      instance,
      to,
    };
  }

  /** Creates a CRM lead (deal in the first active pipeline stage) for a contact
   * who just made contact — replaces the old `auto_create_deal_on_contact`
   * trigger, which fired for EVERY inserted contact and flooded the pipeline
   * with leads for bulk-imported address-book entries. Now called only from the
   * inbound path (someone actually messaged). Idempotent: skips if the contact
   * already has any deal, and never throws (a CRM hiccup must not drop the
   * message). */
  async createLeadForContact(contactId: string, title: string): Promise<void> {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from('deals').select('id').eq('contact_id', contactId).limit(1).maybeSingle();
    if (existing) return;

    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('is_active', true)
      .order('position')
      .limit(1)
      .maybeSingle();
    if (!stage) {
      logger.warn({ contactId }, '[repo] no active pipeline stage — lead not created');
      return;
    }

    const { error } = await supabase.from('deals').insert({
      contact_id: contactId,
      title: title || 'Novo Lead',
      stage: 'new',
      stage_id: stage.id,
      priority: 'medium',
      user_id: null,
    });
    if (error) logger.warn({ contactId, err: error.message }, '[repo] failed to create lead');
  }

  /**
   * Records where a lead came from, on first touch only.
   *
   * `ON CONFLICT DO NOTHING` against the contact_id primary key is what makes
   * first-touch attribution immutable — no later message can rewrite the origin,
   * so a lead that came from the September ad still reads as the September ad
   * after it comes back through an organic message in November. That also means
   * this is safe to call on every inbound without a "is this the first?" check.
   *
   * Only the RAW signals are stored. Which campaign they belong to is resolved at
   * read time by `lead_attribution_resolved` against the editable
   * `campaign_mappings`, so a manager fixing a mapping re-attributes the whole
   * history (see migration 20260810100100).
   *
   * Never throws: an attribution hiccup must not drop the message that carried it.
   */
  async recordAttribution(contactId: string, channel: string, attribution: InboundAttribution, instance?: string): Promise<void> {
    const supabase = getSupabase();

    // Undefined keys are dropped so `source_raw` only ever contains signals that
    // genuinely arrived — an unmapped-values report must not be polluted by nulls.
    const sourceRaw: Record<string, string> = {};
    const put = (key: string, value?: string) => { if (value) sourceRaw[key] = value; };
    put('ad_id', attribution.adId);
    put('ad_title', attribution.adTitle);
    put('ad_url', attribution.adUrl);
    put('ad_source_app', attribution.adSourceApp);
    put('ctwa_clid', attribution.ctwaClid);
    put('meta_campaign_name', attribution.metaCampaignName);
    put('ref', attribution.ref);
    put('utm_source', attribution.utmSource);
    put('utm_medium', attribution.utmMedium);
    put('utm_campaign', attribution.utmCampaign);
    put('landing_path', attribution.landingPath);
    put('instance', instance);

    const { error } = await supabase
      .from('contact_attribution')
      .upsert({
        contact_id: contactId,
        source_channel: channel,
        source_kind: attribution.kind,
        source_raw: sourceRaw,
        set_manually: false,
      }, { onConflict: 'contact_id', ignoreDuplicates: true });

    if (error) logger.warn({ contactId, err: error.message }, '[repo] failed to record lead attribution');
  }

  /** Whether this Meta ad id already has a row in `meta_ad_catalog` (resolved or failed). */
  async hasCatalogedAd(adId: string): Promise<boolean> {
    const { data } = await getSupabase().from('meta_ad_catalog').select('ad_id').eq('ad_id', adId).maybeSingle();
    return Boolean(data);
  }

  /**
   * Distinct ad ids seen in lead attribution that still need a catalog lookup:
   * never looked up, or (with `retryFailed`) looked up and failed. `all` returns
   * every id, for a full refresh after campaigns are renamed.
   */
  async listAdIdsForCatalog(mode: 'missing' | 'retryFailed' | 'all'): Promise<string[]> {
    const supabase = getSupabase();
    const PAGE = 1000;
    const adIds = new Set<string>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('contact_attribution')
        .select('source_raw')
        .not('source_raw->>ad_id', 'is', null)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`[repo] listAdIdsForCatalog: ${error.message}`);
      for (const row of data ?? []) {
        const adId = (row.source_raw as Record<string, string> | null)?.ad_id;
        if (adId) adIds.add(adId);
      }
      if (!data || data.length < PAGE) break;
    }
    if (mode === 'all') return [...adIds];

    const { data, error } = await supabase.from('meta_ad_catalog').select('ad_id, lookup_error');
    if (error) throw new Error(`[repo] listAdIdsForCatalog: ${error.message}`);
    const settled = new Set(
      (data ?? []).filter((r) => mode === 'missing' || !r.lookup_error).map((r) => r.ad_id as string),
    );
    return [...adIds].filter((id) => !settled.has(id));
  }

  async upsertAdCatalog(rows: MetaAdCatalogRow[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await getSupabase()
      .from('meta_ad_catalog')
      .upsert(rows.map((r) => ({ ...r, fetched_at: new Date().toISOString() })), { onConflict: 'ad_id' });
    if (error) throw new Error(`[repo] upsertAdCatalog: ${error.message}`);
  }

  /**
   * Backfill source: WhatsApp 1:1 conversations opened since `sinceIso` whose
   * contact has no attribution yet, each with its first inbound message's
   * provider id — the key to look the original payload up in Evolution's store.
   * Paged because supabase-js caps a select at 1000 rows.
   */
  async listUnattributedFirstInbound(sinceIso: string): Promise<Array<{ contactId: string; instance: string; providerMessageId: string }>> {
    const supabase = getSupabase();
    const PAGE = 500;
    const conversations: Array<{ id: string; contact_id: string; metadata: Record<string, any> | null }> = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, contact_id, metadata')
        .gte('created_at', sinceIso)
        .order('created_at')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`[repo] listUnattributedFirstInbound: ${error.message}`);
      conversations.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    const candidates = conversations.filter((c) => c.metadata?.provider === 'evolution' && c.metadata?.instance);
    const attributed = new Set<string>();
    const contactIds = [...new Set(candidates.map((c) => c.contact_id))];
    for (let i = 0; i < contactIds.length; i += 200) {
      const { data, error } = await supabase
        .from('contact_attribution')
        .select('contact_id')
        .in('contact_id', contactIds.slice(i, i + 200));
      if (error) throw new Error(`[repo] listUnattributedFirstInbound: ${error.message}`);
      for (const row of data ?? []) attributed.add(row.contact_id);
    }

    const result: Array<{ contactId: string; instance: string; providerMessageId: string }> = [];
    const seen = new Set<string>();
    for (const conv of candidates) {
      if (attributed.has(conv.contact_id) || seen.has(conv.contact_id)) continue;
      const { data } = await supabase
        .from('messages')
        .select('whatsapp_message_id')
        .eq('conversation_id', conv.id)
        .eq('from_type', 'user')
        .not('whatsapp_message_id', 'is', null)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (!data?.whatsapp_message_id) continue;
      seen.add(conv.contact_id);
      result.push({ contactId: conv.contact_id, instance: String(conv.metadata!.instance), providerMessageId: data.whatsapp_message_id });
    }
    return result;
  }

  /**
   * Display name of the operator behind `messages.sent_by`, used to sign the
   * outgoing text (see channels/outboundSignature.ts). Cached because it is hit
   * once per human reply and a team name changes about never; the short TTL is
   * only so a rename lands without a restart. Returns undefined on any miss, and
   * never throws — an unsigned message is far better than a dropped one.
   */
  async getOperatorName(userId: string): Promise<string | undefined> {
    const cached = operatorNameCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.name;

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('team_members')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.warn({ userId, err: error.message }, '[repo] failed to resolve operator name');
      return undefined;
    }

    const name = (data?.name as string | undefined)?.trim() || undefined;
    operatorNameCache.set(userId, { name, expiresAt: Date.now() + OPERATOR_NAME_TTL_MS });
    return name;
  }

  /** The company's Pix key from Configurações, or null when none is registered
   *  yet. Read fresh on every send: it is one row, and a key changed in the
   *  settings screen must never go out stale. */
  async getPixSettings(): Promise<PixDetails | null> {
    const { data, error } = await getSupabase()
      .from('pix_settings')
      .select('merchant_name, key_type, pix_key')
      .eq('id', true)
      .maybeSingle();
    if (error) throw new Error(`[repo] failed to read pix settings: ${error.message}`);
    if (!data?.pix_key || !data.merchant_name) return null;
    return { merchant_name: data.merchant_name, key: data.pix_key, key_type: data.key_type as PixKeyType };
  }

  /** Best-effort name lookup for phone numbers we already know as contacts —
   * used to enrich a WhatsApp group's participant list (people who've never
   * messaged us directly just show as a phone number). */
  async getContactNamesByPhone(phoneNumbers: string[]): Promise<Record<string, string>> {
    if (phoneNumbers.length === 0) return {};
    const supabase = getSupabase();
    const { data } = await supabase.from('contacts').select('phone_number, name').in('phone_number', phoneNumbers);
    const result: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.name) result[row.phone_number as string] = row.name as string;
    }
    return result;
  }

  /** Uploads inbound media to the (already public) shared media bucket and
   * returns its public URL — bypasses RLS via the service-role client, same as
   * every other write here. Returns null (never throws) on failure, so a
   * storage hiccup degrades to a text-only placeholder instead of dropping
   * the whole inbound message. */
  private async uploadInboundMedia(conversationId: string, providerMessageId: string, media: InboundMedia): Promise<string | null> {
    const supabase = getSupabase();
    const path = `${conversationId}/${providerMessageId}.${mediaExtension(media.mimeType, media.fileName)}`;
    const buffer = Buffer.from(media.base64, 'base64');

    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
      contentType: media.mimeType,
      upsert: true,
    });
    if (error) {
      logger.warn({ err: error.message, path, kind: media.kind }, '[repo] failed to upload inbound media');
      return null;
    }
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Returns inserted:false on unique-violation (dedup by whatsapp_message_id), matching the legacy webhook's idempotency. */
  async insertInboundMessage(input: {
    conversationId: string;
    channel: string;
    providerMessageId: string;
    content: string;
    tsSec?: number;
    media?: InboundMedia;
    /** Group only: who sent this message, stored on messages.metadata so the UI
     *  can label each bubble (the conversation contactName is the group subject). */
    sender?: { name?: string; phone?: string };
    quotedProviderMessageId?: string;
    /** A Pix card the other side sent — drawn as a card in the timeline. */
    pix?: PixMessageMeta;
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const replyToId = await this.resolveReplyToId(input.conversationId, input);
    const sentAt = input.tsSec ? new Date(input.tsSec * 1000).toISOString() : new Date().toISOString();

    const mediaUrl = input.media
      ? await this.uploadInboundMedia(input.conversationId, input.providerMessageId, input.media)
      : null;

    const sender = input.sender && (input.sender.name || input.sender.phone)
      ? { name: input.sender.name ?? null, phone: input.sender.phone ?? null }
      : null;

    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      channel: input.channel,
      whatsapp_message_id: input.providerMessageId,
      content: input.content,
      type: mediaUrl ? mediaKindToDbType(input.media!.kind) : 'text',
      media_url: mediaUrl,
      media_type: mediaUrl ? input.media!.mimeType : null,
      from_type: 'user',
      status: 'sent',
      sent_at: sentAt,
      reply_to_id: replyToId,
      ...(sender || input.pix ? { metadata: { ...(sender ? { sender } : {}), ...(input.pix ? { pix: input.pix } : {}) } } : {}),
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') return { inserted: false };
      throw new Error(`[repo] failed to insert inbound message: ${error.message}`);
    }
    await this.touchConversation(input.conversationId);
    return { inserted: true };
  }

  async insertOutboundMessage(input: {
    conversationId: string;
    channel: string;
    providerMessageId?: string;
    content: string;
    fromType: 'nina' | 'human';
    /** Only meaningful for `fromType: 'human'` — see messages.sent_by. */
    operatorId?: string;
    /** Provider timestamp, for a row we did not originate (an echo). Without it
     *  a message typed hours ago on a phone would sort to "now" in the timeline. */
    tsSec?: number;
    /** Our own `messages.id` being replied to (platform send). */
    replyToId?: string;
    /** Provider id of the quoted message (echo from the phone). */
    quotedProviderMessageId?: string;
    /** `messages.metadata` — e.g. `{ pix }` for a Pix card. */
    metadata?: Record<string, unknown>;
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const replyToId = await this.resolveReplyToId(input.conversationId, input);
    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      channel: input.channel,
      whatsapp_message_id: input.providerMessageId ?? null,
      content: input.content,
      type: 'text',
      from_type: input.fromType,
      sent_by: input.fromType === 'human' ? (input.operatorId ?? null) : null,
      status: 'sent',
      sent_at: input.tsSec ? new Date(input.tsSec * 1000).toISOString() : new Date().toISOString(),
      reply_to_id: replyToId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        // Both halves of a platform send race for the same row: our own pipeline
        // and the provider's echo of it. Whichever loses lands here. Only our
        // pipeline knows the operator and the unsigned text, so when it is the
        // loser it patches what the echo could not know rather than dropping it
        // — otherwise a reply typed IN the platform would end up unattributed
        // and displaying its own on-the-wire signature back to us.
        await this.patchOutboundAttribution({ ...input, replyToId: replyToId ?? undefined });
        return { inserted: false };
      }
      throw new Error(`[repo] failed to insert outbound message: ${error.message}`);
    }
    await this.touchConversation(input.conversationId);
    return { inserted: true };
  }

  /**
   * Restores what only our own send pipeline knows onto a row the provider echo
   * inserted first: the operator behind it, and the clean unsigned text.
   * No-op for an echo losing to us (it knows neither), and never throws — the
   * message is already stored, and attribution must not cost a delivery.
   */
  /** The message an operator chose to reply to, checked to belong to this
   *  conversation. `providerMessageId` is null for rows the provider never
   *  acknowledged — the reply is then stored as a reply but sent unquoted. */
  async getReplyTarget(conversationId: string, messageId: string): Promise<{ id: string; providerMessageId: string | null } | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('messages')
      .select('id, whatsapp_message_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    return data ? { id: data.id, providerMessageId: data.whatsapp_message_id ?? null } : null;
  }

  /** A message an operator wants to edit, checked to belong to this
   *  conversation — everything the edit rules need to accept or refuse it. */
  async getMessageForEdit(conversationId: string, messageId: string): Promise<EditableMessage | null> {
    const { data } = await getSupabase()
      .from('messages')
      .select('id, whatsapp_message_id, from_type, sent_by, sent_at, type, media_url, content, metadata')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      providerMessageId: data.whatsapp_message_id ?? null,
      fromType: data.from_type,
      sentBy: data.sent_by ?? null,
      sentAt: data.sent_at,
      type: data.type,
      mediaUrl: data.media_url ?? null,
      content: data.content ?? '',
      metadata: (data.metadata as Record<string, unknown> | null) ?? {},
    };
  }

  /**
   * Stores an edit already accepted by the provider. The first version is kept
   * in `metadata.original_content`, and later edits never overwrite it. The
   * customer no longer sees it, but a supervisor reviewing the thread must be
   * able to see what was actually said first.
   */
  async applyMessageEdit(message: EditableMessage, content: string): Promise<void> {
    const metadata = {
      ...message.metadata,
      edited_at: new Date().toISOString(),
      original_content: message.metadata.original_content ?? message.content,
    };
    const { error } = await getSupabase()
      .from('messages')
      .update({ content, metadata })
      .eq('id', message.id);
    if (error) throw new Error(`[repo] failed to store message edit: ${error.message}`);
  }

  /** `reply_to_id` for a row being inserted: our own id when the platform sent
   *  the reply, otherwise the quoted provider id resolved within the same
   *  conversation. A quote of a message we never stored stays null. */
  private async resolveReplyToId(
    conversationId: string,
    input: { replyToId?: string; quotedProviderMessageId?: string },
  ): Promise<string | null> {
    if (input.replyToId) return input.replyToId;
    if (!input.quotedProviderMessageId) return null;
    const { data } = await getSupabase()
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('whatsapp_message_id', input.quotedProviderMessageId)
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  private async patchOutboundAttribution(input: {
    conversationId: string;
    providerMessageId?: string;
    content: string;
    fromType: 'nina' | 'human';
    operatorId?: string;
    replyToId?: string;
    /** Only our pipeline knows it too: the echo of our branded Pix card reads
     *  as plain body text, and the row must still render as the card. */
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!input.providerMessageId || (!input.operatorId && !input.metadata)) return;
    const supabase = getSupabase();
    const { error } = await supabase
      .from('messages')
      .update({
        ...(input.operatorId ? { sent_by: input.operatorId } : {}),
        from_type: input.fromType,
        content: input.content,
        ...(input.replyToId ? { reply_to_id: input.replyToId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      })
      // Scoped to the conversation: the same provider id also exists as the
      // inbound row when the recipient is another number on this platform.
      .eq('conversation_id', input.conversationId)
      .eq('whatsapp_message_id', input.providerMessageId)
      .is('sent_by', null);
    if (error) {
      logger.warn({ err: error.message, providerMessageId: input.providerMessageId }, '[repo] failed to patch outbound attribution onto echoed row');
    }
  }

  /** Uploads an outbound attachment to the shared public media bucket and
   *  returns its public URL (for our own timeline display). Throws on failure —
   *  unlike the inbound path, a human is waiting on the send, so a storage
   *  error should surface rather than silently degrade. */
  async storeOutboundMedia(conversationId: string, base64: string, mimeType: string, fileName?: string): Promise<string> {
    const supabase = getSupabase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const path = `${conversationId}/out-${unique}.${mediaExtension(mimeType, fileName)}`;
    const buffer = Buffer.from(base64, 'base64');

    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) throw new Error(`[repo] failed to upload outbound media: ${error.message}`);
    return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Inserts a human operator's outbound media message (image/video/audio/
   *  document) so it renders in the timeline exactly like an inbound one. */
  async insertOutboundMediaMessage(input: {
    conversationId: string;
    channel: string;
    providerMessageId?: string;
    content: string;
    mediaUrl: string;
    mediaType: string;
    dbType: 'audio' | 'image' | 'video' | 'document';
    operatorId?: string;
    /** Provider timestamp — see insertOutboundMessage. */
    tsSec?: number;
    quotedProviderMessageId?: string;
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const replyToId = await this.resolveReplyToId(input.conversationId, input);
    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      channel: input.channel,
      whatsapp_message_id: input.providerMessageId ?? null,
      content: input.content,
      type: input.dbType,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      from_type: 'human',
      sent_by: input.operatorId ?? null,
      status: 'sent',
      sent_at: input.tsSec ? new Date(input.tsSec * 1000).toISOString() : new Date().toISOString(),
      reply_to_id: replyToId,
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') {
        await this.patchOutboundAttribution({ ...input, content: input.content, fromType: 'human' });
        return { inserted: false };
      }
      throw new Error(`[repo] failed to insert outbound media message: ${error.message}`);
    }
    await this.touchConversation(input.conversationId);
    return { inserted: true };
  }

  /** Updates a previously-sent outbound message's delivery status by its
   * provider message id — the only link we have back to a specific row,
   * since Evolution's status webhook doesn't carry our conversationId. */
  async updateMessageStatus(providerMessageId: string, status: MessageDeliveryStatus): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('messages')
      .update({ status })
      .eq('whatsapp_message_id', providerMessageId)
      // Delivery acks are for what we sent; the same id can also be the
      // recipient's inbound row when both numbers are on this platform.
      .neq('from_type', 'user');

    if (error) logger.warn({ providerMessageId, status, err: error.message }, '[repo] failed to update message status');
  }

  async getRecentHistory(conversationId: string, limit = 20): Promise<IncomingMessage[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('messages')
      .select('content, from_type, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    // Newest `limit` messages, back in chronological order (it used to take the oldest).
    return data
      .reverse()
      .filter((m) => typeof m.content === 'string' && m.content.length > 0)
      .map((m) => ({ fromType: m.from_type as IncomingMessage['fromType'], content: m.content as string }));
  }

  /** Latest `limit` text messages in chronological order, plus the contact name — the input for the Lu summary. */
  async getSummaryTranscript(conversationId: string, limit = 80): Promise<{ contactName: string | null; messages: IncomingMessage[] }> {
    const supabase = getSupabase();
    const [{ data: conv }, { data, error }] = await Promise.all([
      supabase.from('conversations').select('contacts(name, call_name)').eq('id', conversationId).maybeSingle(),
      supabase
        .from('messages')
        .select('content, from_type, sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(limit),
    ]);

    const contact = (conv as { contacts?: { name?: string | null; call_name?: string | null } | null } | null)?.contacts;
    const messages = error || !data
      ? []
      : data
        .filter((m) => typeof m.content === 'string' && m.content.length > 0)
        .reverse()
        .map((m) => ({ fromType: m.from_type as IncomingMessage['fromType'], content: m.content as string }));

    return { contactName: contact?.name || contact?.call_name || null, messages };
  }

  /**
   * Latest `limit` messages (text only in `messages`, chronological) plus the id
   * and sender of the very last message of any type — the cache key and the
   * "is the customer waiting?" signal for Lu's insight.
   */
  async getInsightInput(conversationId: string, limit = 30): Promise<{
    contactName: string | null;
    messages: IncomingMessage[];
    lastMessageId: string | null;
    lastFromType: IncomingMessage['fromType'] | null;
  }> {
    const supabase = getSupabase();
    const [{ data: conv }, { data, error }] = await Promise.all([
      supabase.from('conversations').select('contacts(name, call_name)').eq('id', conversationId).maybeSingle(),
      supabase
        .from('messages')
        .select('id, content, from_type, sent_at')
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(limit),
    ]);

    const contact = (conv as { contacts?: { name?: string | null; call_name?: string | null } | null } | null)?.contacts;
    const rows = error || !data ? [] : data;
    const last = rows[0];
    return {
      contactName: contact?.name || contact?.call_name || null,
      messages: rows
        .filter((m) => typeof m.content === 'string' && m.content.length > 0)
        .reverse()
        .map((m) => ({ fromType: m.from_type as IncomingMessage['fromType'], content: m.content as string })),
      lastMessageId: (last?.id as string | undefined) ?? null,
      lastFromType: (last?.from_type as IncomingMessage['fromType'] | undefined) ?? null,
    };
  }

  async getCachedInsight(conversationId: string): Promise<{ lastMessageId: string; payload: unknown } | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('conversation_insights')
      .select('last_message_id, payload')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    return data ? { lastMessageId: data.last_message_id as string, payload: data.payload } : null;
  }

  async saveInsight(conversationId: string, lastMessageId: string, payload: unknown): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('conversation_insights')
      .upsert({ conversation_id: conversationId, last_message_id: lastMessageId, payload, created_at: new Date().toISOString() });
    if (error) logger.warn({ conversationId, err: error.message }, '[repo] failed to cache insight');
  }

  async getConversationMode(conversationId: string): Promise<ConversationMode> {
    const supabase = getSupabase();
    const { data } = await supabase.from('conversations').select('status').eq('id', conversationId).maybeSingle();
    return statusToMode((data?.status as DbStatus) ?? 'nina');
  }

  async setConversationMode(conversationId: string, mode: ConversationMode): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('conversations').update({ status: modeToStatus(mode) }).eq('id', conversationId);
  }

  async touchConversation(conversationId: string): Promise<void> {
    const supabase = getSupabase();
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  }

  /**
   * Bulk-imports a WhatsApp address book (Evolution `findContacts`) into
   * `contacts`. Three upsert passes, split precisely by what's actually known,
   * so a missing field is never written over data we already have:
   *   - has a name: full upsert (name/call_name/picture) — genuinely fresh data.
   *   - has only a picture (no `pushName` — very common upstream): upsert
   *     WITHOUT `name`/`call_name` keys in the row at all. Supabase builds
   *     `ON CONFLICT ... DO UPDATE SET` from whatever keys are present in the
   *     payload, so omitting them here leaves an existing name untouched
   *     (this is the exact bug this replaced: including `name: null` in that
   *     upsert clobbered real names whenever only a picture was available).
   *   - has neither: `ignoreDuplicates` insert-only, never touches an existing row.
   * Importing does NOT create CRM leads: leads are created only when a contact
   * actually messages (see createLeadForContact), so the imported address book
   * never floods the pipeline. (Previously an AFTER INSERT trigger created a
   * lead per contact — removed.)
   */
  async bulkImportContacts(contacts: ImportContactInput[]): Promise<BulkImportContactsResult> {
    if (contacts.length === 0) return { imported: 0, updated: 0 };
    const supabase = getSupabase();

    const phoneNumbers = contacts.map((c) => c.phoneNumber);
    const { data: existingRows } = await supabase
      .from('contacts')
      .select('external_id')
      .eq('channel', 'whatsapp')
      .in('external_id', phoneNumbers);
    const existing = new Set((existingRows ?? []).map((r) => r.external_id as string));

    const withName = contacts.filter((c) => c.name);
    const withPicOnly = contacts.filter((c) => !c.name && c.profilePictureUrl);
    const withNeither = contacts.filter((c) => !c.name && !c.profilePictureUrl);

    // An address-book import is WhatsApp by definition. The conflict target is
    // the (channel, external_id) key introduced in 20260810100000 — the old
    // single-column `phone_number` unique no longer exists, so upserting on it
    // would fail outright.
    const identity = (phoneNumber: string) => ({
      channel: 'whatsapp',
      external_id: phoneNumber,
      phone_number: phoneNumber,
      whatsapp_id: phoneNumber,
    });
    const ON_CONFLICT = 'channel,external_id';

    if (withName.length > 0) {
      const rows = withName.map((c) => ({
        ...identity(c.phoneNumber),
        name: c.name,
        call_name: c.name!.split(' ')[0],
        profile_picture_url: c.profilePictureUrl ?? null,
        user_id: null,
      }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: ON_CONFLICT });
      if (error) throw new Error(`[repo] failed to upsert contacts with name: ${error.message}`);
    }

    if (withPicOnly.length > 0) {
      // Deliberately no `name`/`call_name` keys — see method doc.
      const rows = withPicOnly.map((c) => ({ ...identity(c.phoneNumber), profile_picture_url: c.profilePictureUrl, user_id: null }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: ON_CONFLICT });
      if (error) throw new Error(`[repo] failed to upsert contacts with picture only: ${error.message}`);
    }

    if (withNeither.length > 0) {
      const rows = withNeither.map((c) => ({ ...identity(c.phoneNumber), user_id: null }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: ON_CONFLICT, ignoreDuplicates: true });
      if (error) throw new Error(`[repo] failed to insert bare contacts: ${error.message}`);
    }

    const imported = phoneNumbers.filter((p) => !existing.has(p)).length;
    return { imported, updated: phoneNumbers.length - imported };
  }

  /**
   * Timeline persistence has no home yet — there is no timeline table in
   * Supabase (the frontend Timeline is CRM mock data). Stubbed with a log
   * this pass; real persistence is deferred (out of scope: advanced handoff).
   */
  async recordTimelineEntry(conversationId: string, entry: string): Promise<void> {
    logger.info({ conversationId, entry }, '[repo] timeline (stub — no table yet)');
  }
}

export const conversationRepository = new ConversationRepository();
