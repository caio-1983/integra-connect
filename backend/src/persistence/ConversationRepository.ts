import type { ConversationMode, IncomingMessage, MessageDeliveryStatus } from '../types/index.js';
import type { InboundMedia } from '../channels/channelEvents.js';
import { getSupabase } from './supabaseClient.js';
import { logger } from '../logger/Logger.js';

// Reuses the existing public `audio-messages` bucket for ALL inbound media
// (audio/image/video/document) — it's already public and provisioned, so no new
// bucket or migration is needed. The name is historical; treat it as the shared
// inbound-media bucket.
const MEDIA_BUCKET = 'audio-messages';

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

export interface FindOrCreateContactResult { contactId: string; }
export interface FindOrCreateConversationResult { conversationId: string; created: boolean; }
export interface InsertMessageResult { inserted: boolean; }
export interface ImportContactInput { phoneNumber: string; name?: string | null; profilePictureUrl?: string | null; }
export interface BulkImportContactsResult { imported: number; updated: number; }

class ConversationRepository {
  /** `isGroup` also refreshes `name` on every message for an existing contact
   * — the group's subject can change and is re-resolved per message
   * (EvolutionChannelConnector), so this lets a rename self-heal. Individual
   * contacts intentionally keep their name frozen after creation, so a
   * WhatsApp pushName change (or a manual CRM edit) is never clobbered. */
  async findOrCreateContact(phone: string, pushName?: string, isGroup?: boolean): Promise<FindOrCreateContactResult> {
    const supabase = getSupabase();
    const { data: existing } = await supabase.from('contacts').select('id').eq('phone_number', phone).maybeSingle();

    if (existing) {
      const update: Record<string, unknown> = { last_activity: new Date().toISOString() };
      if (isGroup && pushName) {
        update.name = pushName;
        update.call_name = pushName;
      }
      await supabase.from('contacts').update(update).eq('id', existing.id);
      return { contactId: existing.id };
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        phone_number: phone,
        whatsapp_id: phone,
        name: pushName ?? null,
        call_name: pushName?.split(' ')[0] ?? null,
        user_id: null,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`[repo] failed to create contact: ${error?.message}`);
    return { contactId: data.id };
  }

  /** `instance` is persisted on `conversations.metadata` at creation time —
   * it's the only record we keep of which Evolution instance owns this
   * conversation, needed later to route a human operator's manual reply
   * (see getConversationChannelInfo). There is no separate instances table.
   *
   * Group conversations default to `status: 'human'` (never 'nina') so the AI
   * doesn't auto-reply from the moment the group thread is created — belt and
   * suspenders alongside ConversationService's hard isGroup guard, which is
   * what actually prevents it even if someone later flips the mode. */
  async findOrCreateConversation(contactId: string, instance: string, isGroup?: boolean): Promise<FindOrCreateConversationResult> {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) return { conversationId: existing.id, created: false };

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        contact_id: contactId,
        status: isGroup ? 'human' : 'nina',
        is_active: true,
        user_id: null,
        metadata: isGroup ? { instance, isGroup: true } : { instance },
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(`[repo] failed to create conversation: ${error?.message}`);
    return { conversationId: data.id, created: true };
  }

  /** Resolves the Evolution instance + recipient phone for a conversation, so
   * a manual operator reply (no fresh inbound event to read this from) can
   * still be routed correctly. Returns null if the conversation predates
   * instance tracking, or has no contact. */
  async getConversationChannelInfo(conversationId: string): Promise<{ instance: string; to: string } | null> {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('conversations')
      .select('metadata, contacts(phone_number)')
      .eq('id', conversationId)
      .maybeSingle();

    const instance = (data?.metadata as { instance?: string } | null)?.instance;
    const to = (data?.contacts as unknown as { phone_number?: string } | null)?.phone_number;
    if (!instance || !to) return null;
    return { instance, to };
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
    providerMessageId: string;
    content: string;
    tsSec?: number;
    media?: InboundMedia;
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const sentAt = input.tsSec ? new Date(input.tsSec * 1000).toISOString() : new Date().toISOString();

    const mediaUrl = input.media
      ? await this.uploadInboundMedia(input.conversationId, input.providerMessageId, input.media)
      : null;

    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      whatsapp_message_id: input.providerMessageId,
      content: input.content,
      type: mediaUrl ? mediaKindToDbType(input.media!.kind) : 'text',
      media_url: mediaUrl,
      media_type: mediaUrl ? input.media!.mimeType : null,
      from_type: 'user',
      status: 'sent',
      sent_at: sentAt,
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
    providerMessageId?: string;
    content: string;
    fromType: 'nina' | 'human';
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      whatsapp_message_id: input.providerMessageId ?? null,
      content: input.content,
      type: 'text',
      from_type: input.fromType,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') return { inserted: false };
      throw new Error(`[repo] failed to insert outbound message: ${error.message}`);
    }
    await this.touchConversation(input.conversationId);
    return { inserted: true };
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
    providerMessageId?: string;
    content: string;
    mediaUrl: string;
    mediaType: string;
    dbType: 'audio' | 'image' | 'video' | 'document';
  }): Promise<InsertMessageResult> {
    const supabase = getSupabase();
    const { error } = await supabase.from('messages').insert({
      conversation_id: input.conversationId,
      whatsapp_message_id: input.providerMessageId ?? null,
      content: input.content,
      type: input.dbType,
      media_url: input.mediaUrl,
      media_type: input.mediaType,
      from_type: 'human',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    if (error) {
      if ((error as { code?: string }).code === '23505') return { inserted: false };
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
      .eq('whatsapp_message_id', providerMessageId);

    if (error) logger.warn({ providerMessageId, status, err: error.message }, '[repo] failed to update message status');
  }

  async getRecentHistory(conversationId: string, limit = 20): Promise<IncomingMessage[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('messages')
      .select('content, from_type, sent_at')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data
      .filter((m) => typeof m.content === 'string' && m.content.length > 0)
      .map((m) => ({ fromType: m.from_type as IncomingMessage['fromType'], content: m.content as string }));
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
    const { data: existingRows } = await supabase.from('contacts').select('phone_number').in('phone_number', phoneNumbers);
    const existing = new Set((existingRows ?? []).map((r) => r.phone_number as string));

    const withName = contacts.filter((c) => c.name);
    const withPicOnly = contacts.filter((c) => !c.name && c.profilePictureUrl);
    const withNeither = contacts.filter((c) => !c.name && !c.profilePictureUrl);

    if (withName.length > 0) {
      const rows = withName.map((c) => ({
        phone_number: c.phoneNumber,
        whatsapp_id: c.phoneNumber,
        name: c.name,
        call_name: c.name!.split(' ')[0],
        profile_picture_url: c.profilePictureUrl ?? null,
        user_id: null,
      }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'phone_number' });
      if (error) throw new Error(`[repo] failed to upsert contacts with name: ${error.message}`);
    }

    if (withPicOnly.length > 0) {
      // Deliberately no `name`/`call_name` keys — see method doc.
      const rows = withPicOnly.map((c) => ({ phone_number: c.phoneNumber, whatsapp_id: c.phoneNumber, profile_picture_url: c.profilePictureUrl, user_id: null }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'phone_number' });
      if (error) throw new Error(`[repo] failed to upsert contacts with picture only: ${error.message}`);
    }

    if (withNeither.length > 0) {
      const rows = withNeither.map((c) => ({ phone_number: c.phoneNumber, whatsapp_id: c.phoneNumber, user_id: null }));
      const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'phone_number', ignoreDuplicates: true });
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
