import type { InboundMediaKind, NormalizedInbound, NormalizedInboundMedia, NormalizedStatusUpdate } from './types.js';
import type { MessageDeliveryStatus } from '../../types/messageStatus.js';
import { logger } from '../../logger/Logger.js';

/** Fallback text shown when a media message has no caption, so it's never dropped. */
const MEDIA_PLACEHOLDER: Record<InboundMediaKind, string> = {
  audio: '🎤 Mensagem de voz',
  image: '📷 Imagem',
  video: '🎥 Vídeo',
  document: '📄 Documento',
  sticker: '💟 Figurinha',
};

/** Default mimetype per kind when Evolution omits it. */
const DEFAULT_MIME: Record<InboundMediaKind, string> = {
  audio: 'audio/ogg',
  image: 'image/jpeg',
  video: 'video/mp4',
  document: 'application/octet-stream',
  sticker: 'image/webp',
};

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

  // Media detection — audio/image/video/document/sticker. A document sent with
  // a caption arrives wrapped in `documentWithCaptionMessage`; unwrap it.
  const msg = data.message ?? {};
  const documentNode = msg.documentMessage ?? msg.documentWithCaptionMessage?.message?.documentMessage;
  const mediaNode: { kind: InboundMediaKind; node: Record<string, any> } | null =
    msg.audioMessage   ? { kind: 'audio',    node: msg.audioMessage }
    : msg.imageMessage ? { kind: 'image',    node: msg.imageMessage }
    : msg.videoMessage ? { kind: 'video',    node: msg.videoMessage }
    : documentNode     ? { kind: 'document', node: documentNode }
    : msg.stickerMessage ? { kind: 'sticker', node: msg.stickerMessage }
    : null;

  const caption: string | undefined =
    msg.imageMessage?.caption ?? msg.videoMessage?.caption ?? documentNode?.caption;

  const text: string | undefined =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    caption ??
    (mediaNode ? MEDIA_PLACEHOLDER[mediaNode.kind] : undefined);

  if (!text || !instance || !key.id) {
    // Diagnostic: a message arrived but produced no text/media we handle — log
    // its type keys so an unrecognized WhatsApp message type (e.g. location,
    // contact card, poll) can be identified and added rather than silently dropped.
    if (data.message && !key.fromMe) {
      logger.info({ instance, messageTypes: Object.keys(data.message) }, '[evolution] inbound message dropped — no handled text/media');
    }
    return null;
  }

  // Individual: bare phone digits (unchanged). Group: the full JID kept as-is
  // — it's what gets stored as the "contact"'s phone_number and later reused
  // verbatim as the `to` when sending a reply (Evolution accepts a JID there).
  const externalContactId = isGroup ? remoteJid : remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '');

  // Preview/playback only (no transcription/OCR). Confirmed against the live
  // v2.3.7 server: media arrives as an ENCRYPTED `.enc` URL (mediaKey/
  // fileEncSha256/directPath) — NOT inline base64, even with webhook.base64=true.
  // So the common path is `pendingMedia`, which the connector resolves by
  // calling Evolution's getBase64FromMedia (decrypts + returns base64). The
  // inline-base64 branch is kept as a fast path in case a future config embeds it.
  let media: NormalizedInboundMedia | undefined;
  let pendingMedia: { kind: InboundMediaKind; mimeType: string; fileName?: string } | undefined;
  if (mediaNode) {
    const mimeType: string = mediaNode.node.mimetype ?? DEFAULT_MIME[mediaNode.kind];
    const fileName: string | undefined =
      mediaNode.kind === 'document' ? (mediaNode.node.fileName ?? mediaNode.node.title ?? undefined) : undefined;
    const base64: string | undefined = data.base64 ?? data.message?.base64 ?? mediaNode.node.base64;
    if (base64) {
      media = { kind: mediaNode.kind, mimeType, base64, fileName };
    } else {
      pendingMedia = { kind: mediaNode.kind, mimeType, fileName };
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
    pendingMedia,
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
