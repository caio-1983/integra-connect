import type { NormalizedInbound, NormalizedInboundMedia, NormalizedStatusUpdate } from './types.js';
import type { MessageDeliveryStatus } from '../../types/messageStatus.js';
import { logger } from '../../logger/Logger.js';

/**
 * Shared across v1 and v2 — the inbound webhook envelope is near-identical
 * between versions. Returns null for anything we don't handle this pass
 * (non-message events, our own echoes, groups, non-text), so the orchestrator
 * simply drops it.
 */
export function parseInbound(rawBody: unknown): NormalizedInbound | null {
  const body = (rawBody ?? {}) as Record<string, any>;

  if (body.event !== 'messages.upsert') return null;

  const instance = body.instance;
  const data = body.data ?? {};
  const key = data.key ?? {};

  if (key.fromMe === true) return null; // ignore our own outbound echo (prevents loops/double-insert)

  const remoteJid: string = key.remoteJid ?? '';
  if (!remoteJid) return null;

  // Groups are visible in the queue but the AI never auto-replies in them
  // (ConversationService hard-guards on isGroup) — no group subject is
  // available on the message event itself (Baileys doesn't include it here),
  // so the contact name shown is whoever sent the first tracked message.
  const isGroup = remoteJid.endsWith('@g.us');

  const audio = data.message?.audioMessage;

  const text: string | undefined =
    data.message?.conversation ??
    data.message?.extendedTextMessage?.text ??
    data.message?.imageMessage?.caption ??
    data.message?.videoMessage?.caption ??
    (audio ? '🎤 Mensagem de voz' : undefined);

  if (!text || !instance || !key.id) return null; // text or a supported media placeholder only

  // Individual: bare phone digits (unchanged). Group: the full JID kept as-is
  // — it's what gets stored as the "contact"'s phone_number and later reused
  // verbatim as the `to` when sending a reply (Evolution accepts a JID there).
  const externalContactId = isGroup ? remoteJid : remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '');

  // Playback only this pass (no transcription). Confirmed against the live
  // v2.3.7 server: audio arrives as an ENCRYPTED `.enc` URL (mediaKey/
  // fileEncSha256/directPath) — NOT inline base64, even with webhook.base64=true.
  // So the common path is `pendingAudio`, which the connector resolves by
  // calling Evolution's getBase64FromMedia (decrypts + returns base64). The
  // inline-base64 branch is kept as a fast path in case a future config does
  // embed it.
  let media: NormalizedInboundMedia | undefined;
  let pendingAudio: { mimeType: string } | undefined;
  if (audio) {
    const mimeType: string = audio.mimetype ?? 'audio/ogg';
    const base64: string | undefined = data.base64 ?? data.message?.base64 ?? audio.base64;
    if (base64) {
      media = { kind: 'audio', mimeType, base64 };
    } else {
      pendingAudio = { mimeType };
    }
  }

  return {
    channel: 'whatsapp',
    instance: String(instance),
    externalContactId,
    contactName: data.pushName ?? undefined,
    providerMessageId: String(key.id),
    text: String(text),
    tsSec: typeof data.messageTimestamp === 'number' ? data.messageTimestamp : undefined,
    media,
    pendingAudio,
    isGroup: isGroup || undefined,
  };
}

// Evolution forwards Baileys' numeric WAMessageStatus ack levels in some
// versions/payload shapes and its own string constants in others — mapped
// defensively here since it hasn't been confirmed byte-for-byte against a
// live server yet (see the raw-payload log below).
const STATUS_MAP: Record<string, MessageDeliveryStatus> = {
  SERVER_ACK: 'sent',
  DELIVERY_ACK: 'delivered',
  READ: 'read',
  READ_ACK: 'read',
  PLAYED: 'read',
  ERROR: 'failed',
  '1': 'sent',
  '2': 'sent',
  '3': 'delivered',
  '4': 'read',
  '5': 'read',
  '0': 'failed',
};

/**
 * Shared across v1 and v2. Delivery-status updates (Evolution's
 * `messages.update`) are less standardized across versions than inbound
 * messages, so the raw payload is logged until the exact shape is confirmed
 * against a live server — adjust STATUS_MAP / the field lookups below once
 * verified rather than assuming.
 */
export function parseStatusUpdate(rawBody: unknown): NormalizedStatusUpdate | null {
  const body = (rawBody ?? {}) as Record<string, any>;
  if (body.event !== 'messages.update') return null;

  const instance = body.instance;
  if (!instance) return null;

  const raw = body.data;
  logger.info({ instance, data: raw }, '[evolution] messages.update raw payload');

  const entries = Array.isArray(raw) ? raw : [raw];
  for (const entry of entries) {
    if (!entry) continue;
    const providerMessageId: string | undefined = entry.key?.id ?? entry.keyId ?? entry.id;
    const rawStatus = entry.update?.status ?? entry.status;
    if (!providerMessageId || rawStatus === undefined || rawStatus === null) continue;

    const status = STATUS_MAP[String(rawStatus)];
    if (!status) continue;

    return { channel: 'whatsapp', instance: String(instance), providerMessageId: String(providerMessageId), status };
  }

  return null;
}
