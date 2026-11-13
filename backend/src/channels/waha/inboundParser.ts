import type { InboundMediaKind, NormalizedInbound, NormalizedStatusUpdate } from '../evolution/types.js';
import type { InboundAttribution, QuotedSnapshot } from '../channelEvents.js';
import type { MessageDeliveryStatus } from '../../types/messageStatus.js';
import { extractPix, quotedText, unwrapInteractive } from '../evolution/inboundParser.js';
import { extractRefToken } from '../attributionToken.js';
import { MEDIA_PLACEHOLDER } from '../mediaPlaceholder.js';
import { pixMessageText } from '../pix.js';
import { extractSharedContacts, sharedContactsText } from '../sharedContact.js';
import { logger } from '../../logger/Logger.js';
import { rawMessageId } from './WahaClient.js';

/**
 * WAHA (GOWS engine) webhook → the same normalized shapes the Evolution parser
 * produces, so nothing downstream knows which server delivered the message.
 *
 * Shapes verified on a live WAHA 2026.10.1 / GOWS session (2026-11-13):
 *  - `payload._data.Info` is whatsmeow's MessageInfo and `payload._data.Message`
 *    the WhatsApp protobuf message, field names as in Baileys (conversation,
 *    extendedTextMessage, imageMessage, ...) except a few acronyms in caps
 *    (contextInfo.stanzaID, externalAdReply.sourceID/sourceURL).
 *  - 1:1 chats arrive addressed by `@lid`; the phone JID rides along in
 *    `Info.SenderAlt` (customer → us) and `Info.RecipientAlt` (our echo). In the
 *    capture every inbound and every echo carried it.
 *  - Ids are `{fromMe}_{chat}_{rawId}[_{participant}]`; we keep the raw id.
 *  - Media is already downloaded by WAHA: `payload.media.url` (needs X-Api-Key).
 */

const DEFAULT_MIME: Record<InboundMediaKind, string> = {
  audio: 'audio/ogg',
  image: 'image/jpeg',
  video: 'video/mp4',
  document: 'application/octet-stream',
  sticker: 'image/webp',
};

function kindFromMime(mime: unknown): InboundMediaKind {
  const m = typeof mime === 'string' ? mime.toLowerCase() : '';
  if (m === 'image/webp') return 'sticker';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  return 'document';
}

/** Chats that are not conversations: channels, status updates, broadcast lists. */
const IGNORED_CHAT = /@(newsletter|broadcast)$/;

/** Digits of a phone JID (`5521…@s.whatsapp.net`, `5521…:12@c.us`), or undefined for anything else. */
export function phoneOf(jid: unknown): string | undefined {
  if (typeof jid !== 'string' || !/@(s\.whatsapp\.net|c\.us)$/.test(jid)) return undefined;
  const digits = jid.replace(/@.*$/, '').replace(/:\d+$/, '').replace(/\D/g, '');
  return digits || undefined;
}

/** Same JID without the device suffix (`123:45@lid` → `123@lid`). */
function bareJid(jid: string): string {
  return jid.replace(/:\d+@/, '@');
}

/** First node (depth-limited) under `root` that has `key`, searching plain objects only. */
function findNodeWith(root: unknown, key: string, depth = 0): Record<string, any> | undefined {
  if (!root || typeof root !== 'object' || depth > 6) return undefined;
  const node = root as Record<string, any>;
  if (node[key] !== undefined && node[key] !== null) return node;
  for (const child of Object.values(node)) {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      const hit = findNodeWith(child, key, depth + 1);
      if (hit) return hit;
    }
  }
  return undefined;
}

const pick = (node: Record<string, any> | undefined, ...keys: string[]): any => {
  if (!node) return undefined;
  for (const k of keys) if (node[k] !== undefined && node[k] !== null && node[k] !== '') return node[k];
  return undefined;
};

/**
 * Meta click-to-WhatsApp ad on the customer's first message. Same meaning as
 * Evolution's `extractAdReply`; whatsmeow spells the acronyms in caps, so both
 * spellings are read. NOT yet seen on a live GOWS ad lead — the node is found
 * by name anywhere in the message, which tolerates where it is hung.
 */
export function extractAdReplyWaha(message: Record<string, any>): InboundAttribution | undefined {
  const holder = findNodeWith(message, 'externalAdReply');
  const adReply = holder?.externalAdReply as Record<string, any> | undefined;
  if (!adReply) return undefined;

  const sourceUrl: string | undefined = pick(adReply, 'sourceURL', 'sourceUrl');
  let ctwaClid: string | undefined = pick(adReply, 'ctwaClid', 'ctwaClID') ?? pick(holder, 'ctwaClid');
  if (!ctwaClid && sourceUrl) {
    try {
      ctwaClid = new URL(sourceUrl).searchParams.get('ctwa_clid') ?? undefined;
    } catch {
      // not a URL
    }
  }
  const rawId = pick(adReply, 'sourceID', 'sourceId');
  const adId = rawId !== undefined ? String(rawId) : undefined;
  if (!adId && !ctwaClid) return undefined;

  const sourceType = String(pick(adReply, 'sourceType') ?? '').toLowerCase();
  return {
    adId,
    adTitle: pick(adReply, 'title'),
    adUrl: pick(adReply, 'mediaURL', 'mediaUrl') ?? sourceUrl,
    adSourceApp: pick(adReply, 'sourceApp') ?? pick(holder, 'entryPointConversionApp'),
    ctwaClid,
    kind: sourceType === 'post' || sourceType === '1' ? 'direct_social' : 'paid_ad',
  };
}

/** Stored (history) protos carry absent fields as "" — an image with no caption has `caption: ""`. */
function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** Peels the envelopes WhatsApp wraps content in (disappearing, view-once, captioned document). */
function unwrapContent(message: Record<string, any>): Record<string, any> {
  let node = message;
  for (let depth = 0; depth < 4; depth++) {
    const inner = node.ephemeralMessage?.message
      ?? node.viewOnceMessage?.message
      ?? node.viewOnceMessageV2?.message
      ?? node.viewOnceMessageV2Extension?.message
      ?? node.documentWithCaptionMessage?.message
      ?? node.deviceSentMessage?.message;
    if (!inner || typeof inner !== 'object') break;
    node = inner;
  }
  return node;
}

/** Message types that are not content: edits, deletions, reactions, key/sync traffic. */
function isControlMessage(message: Record<string, any>): boolean {
  return Boolean(
    message.protocolMessage || message.reactionMessage || message.editedMessage || message.encReactionMessage
      || message.senderKeyDistributionMessage && Object.keys(message).length === 1,
  );
}

/** One parsed `message.any`, plus what the connector must still fetch. */
export interface WahaParsedMessage {
  fromMe: boolean;
  message: NormalizedInbound;
  /** WAHA-hosted media to download (the connector does it, the parser stays pure). */
  mediaUrl?: string;
  /** Set when the 1:1 chat came as `@lid` with no phone alongside: the connector asks WAHA's lid map. */
  unresolvedLid?: string;
}

export function parseWahaMessage(rawBody: unknown): WahaParsedMessage | null {
  const body = (rawBody ?? {}) as Record<string, any>;
  if (body.event !== 'message.any') return null;

  const instance: string | undefined = body.metadata?.instance ?? body.session;
  const p = (body.payload ?? {}) as Record<string, any>;
  const info = (p._data?.Info ?? {}) as Record<string, any>;
  const rawMessage = (p._data?.Message ?? {}) as Record<string, any>;
  const fromMe = p.fromMe === true || info.IsFromMe === true;

  const chat: string = bareJid(String(info.Chat || (fromMe ? p.to : p.from) || p.from || ''));
  if (!chat || IGNORED_CHAT.test(chat) || !instance) return null;
  if (isControlMessage(rawMessage)) return null;

  const isGroup = chat.endsWith('@g.us');
  const msg = unwrapContent(rawMessage);

  const documentNode = msg.documentMessage;
  const mediaNode: { kind: InboundMediaKind; node: Record<string, any> } | null =
    msg.audioMessage ? { kind: 'audio', node: msg.audioMessage }
    : msg.imageMessage ? { kind: 'image', node: msg.imageMessage }
    : msg.videoMessage ? { kind: 'video', node: msg.videoMessage }
    : documentNode ? { kind: 'document', node: documentNode }
    : msg.stickerMessage ? { kind: 'sticker', node: msg.stickerMessage }
    // A stored message may come without the raw proto: fall back to WAHA's own fields.
    : p.hasMedia === true ? { kind: kindFromMime(p.media?.mimetype), node: { mimetype: p.media?.mimetype, fileName: p.media?.filename } }
    : null;

  const caption: string | undefined = nonEmpty(msg.imageMessage?.caption) ?? nonEmpty(msg.videoMessage?.caption) ?? nonEmpty(documentNode?.caption);
  const interactive = unwrapInteractive(rawMessage);
  const pix = interactive ? extractPix(interactive) : undefined;
  const interactiveText: string | undefined = pix
    ? pixMessageText(pix)
    : (typeof interactive?.body?.text === 'string' ? interactive.body.text.trim() || undefined : undefined);
  const contacts = extractSharedContacts(msg);

  const rawText: string | undefined =
    nonEmpty(msg.conversation) ??
    nonEmpty(msg.extendedTextMessage?.text) ??
    caption ??
    interactiveText ??
    (contacts ? sharedContactsText(contacts) : undefined) ??
    (mediaNode ? MEDIA_PLACEHOLDER[mediaNode.kind] : undefined) ??
    (typeof p.body === 'string' && p.body.trim() ? p.body : undefined);

  const adAttribution = fromMe ? undefined : extractAdReplyWaha(rawMessage);
  const { ref, cleanText } = rawText ? extractRefToken(rawText) : { ref: undefined, cleanText: rawText };
  const attribution: InboundAttribution | undefined = adAttribution ?? (ref ? { ref, kind: 'website' } : undefined);

  const providerMessageId: string | undefined = info.ID || (typeof p.id === 'string' ? rawMessageId(p.id) : undefined);
  const text = cleanText;
  if (!text || !providerMessageId) {
    logger.info({ instance, fromMe, messageTypes: Object.keys(rawMessage) }, '[waha] message dropped — no handled text/media');
    return null;
  }

  // Who the conversation is with. Group: the group JID, as with Evolution.
  // 1:1: the phone digits — from the Alt field for our side or theirs, else the
  // chat itself when it is already a phone JID.
  let externalContactId: string | undefined;
  let unresolvedLid: string | undefined;
  if (isGroup) {
    externalContactId = chat;
  } else {
    externalContactId = phoneOf(fromMe ? info.RecipientAlt : info.SenderAlt) ?? phoneOf(chat);
    if (!externalContactId) {
      if (!chat.endsWith('@lid')) return null;
      unresolvedLid = chat;
      externalContactId = chat; // placeholder until the connector resolves it
    }
  }

  let mediaUrl: string | undefined;
  let pendingMedia: NormalizedInbound['pendingMedia'];
  if (mediaNode) {
    const mimeType: string = mediaNode.node.mimetype ?? p.media?.mimetype ?? DEFAULT_MIME[mediaNode.kind];
    const fileName: string | undefined = mediaNode.kind === 'document'
      ? (mediaNode.node.fileName ?? mediaNode.node.title ?? p.media?.filename ?? undefined)
      : undefined;
    pendingMedia = { kind: mediaNode.kind, mimeType, fileName };
    if (typeof p.media?.url === 'string' && p.media.url) mediaUrl = p.media.url;
  }

  // Quote ("responder"): whatsmeow writes stanzaID.
  const ctxHolder = findNodeWith(msg, 'contextInfo');
  const ctx = ctxHolder?.contextInfo as Record<string, any> | undefined;
  const stanza = pick(ctx, 'stanzaID', 'stanzaId') ?? p.replyTo?.id;
  let quotedProviderMessageId: string | undefined;
  let quoted: QuotedSnapshot | undefined;
  if (stanza) {
    quotedProviderMessageId = String(stanza);
    const qText = quotedText(ctx?.quotedMessage) ?? (typeof p.replyTo?.body === 'string' && p.replyTo.body.trim() ? p.replyTo.body.trim().slice(0, 500) : undefined);
    const participant = bareJid(String(ctx?.participant ?? p.replyTo?.participant ?? ''));
    const domain = (jid: string) => jid.slice(jid.indexOf('@'));
    const fromCustomer = !isGroup && participant.includes('@') && domain(participant) === domain(chat) ? participant === chat : undefined;
    if (qText) quoted = { text: qText, ...(fromCustomer !== undefined ? { fromCustomer } : {}) };
  }

  const pushName: string | undefined = info.PushName || undefined;
  return {
    fromMe,
    mediaUrl,
    unresolvedLid,
    message: {
      channel: 'whatsapp',
      instance: String(instance),
      externalContactId,
      contactName: fromMe || isGroup ? undefined : (pushName ?? info.VerifiedName?.Details?.verifiedName ?? undefined),
      providerMessageId,
      text: String(text),
      tsSec: typeof p.timestamp === 'number' ? p.timestamp : undefined,
      pendingMedia,
      isGroup: isGroup || undefined,
      senderParticipant: isGroup && !fromMe ? (phoneOf(info.SenderAlt) ?? (String(info.Sender ?? '').replace(/[:@].*$/, '') || undefined)) : undefined,
      senderName: isGroup && !fromMe ? pushName : undefined,
      attribution,
      quotedProviderMessageId,
      quoted,
      pix,
      contacts,
    },
  };
}

const ACK_STATUS: Record<string, MessageDeliveryStatus | undefined> = {
  '-1': 'failed',
  '1': 'sent',
  '2': 'delivered',
  '3': 'read',
  '4': 'read',
};

/** `message.ack` for a message WE sent → delivery status. Acks on the customer's messages are ignored. */
export function parseWahaAck(rawBody: unknown): NormalizedStatusUpdate | null {
  const body = (rawBody ?? {}) as Record<string, any>;
  if (body.event !== 'message.ack') return null;
  const instance: string | undefined = body.metadata?.instance ?? body.session;
  const p = (body.payload ?? {}) as Record<string, any>;
  if (!instance || p.fromMe !== true) return null;

  const status = ACK_STATUS[String(p.ack)];
  if (!status) return null;
  const ids: unknown = p._data?.MessageIDs;
  const providerMessageId = Array.isArray(ids) && typeof ids[0] === 'string' ? ids[0] : (typeof p.id === 'string' ? rawMessageId(p.id) : undefined);
  if (!providerMessageId) return null;
  return { channel: 'whatsapp', instance: String(instance), providerMessageId, status };
}
