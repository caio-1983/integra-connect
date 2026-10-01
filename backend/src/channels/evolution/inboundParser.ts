import type {
  InboundMediaKind,
  NormalizedInbound,
  NormalizedInboundMedia,
  NormalizedOutboundEcho,
  NormalizedStatusUpdate,
} from './types.js';
import type { MessageDeliveryStatus } from '../../types/messageStatus.js';
import type { InboundAttribution } from '../channelEvents.js';
import { extractRefToken } from '../attributionToken.js';
import { MEDIA_PLACEHOLDER } from '../mediaPlaceholder.js';
import { pixKeyTypeFromWire, pixMessageText, type PixMessageMeta } from '../pix.js';
import { logger } from '../../logger/Logger.js';

/** Default mimetype per kind when Evolution omits it. */
const DEFAULT_MIME: Record<InboundMediaKind, string> = {
  audio: 'audio/ogg',
  image: 'image/jpeg',
  video: 'video/mp4',
  document: 'application/octet-stream',
  sticker: 'image/webp',
};

/**
 * Pulls the Meta click-to-WhatsApp ad reference off an inbound message.
 *
 * When someone taps "Send message" on a Facebook/Instagram ad, WhatsApp attaches
 * `contextInfo.externalAdReply` to their first message. That is the ONLY place
 * the originating ad is ever stated, and the parser used to discard the whole
 * `contextInfo` node — which is why paid-ad leads were indistinguishable from
 * organic ones.
 *
 * Where `contextInfo` sits depends on the message type. Confirmed against the
 * live v2.3.7 server (2026-09-28): a plain-text first message — the usual CTWA
 * "Olá! Tenho interesse..." — is `message.conversation`, a bare string with no
 * node to hang context on, so Evolution puts it at `data.contextInfo`. Richer
 * types (extendedTextMessage, imageMessage, ...) carry it on the message node.
 * Reading only the node lost most ad leads, so both places are checked.
 * Every field is optional and a miss degrades to "no attribution".
 */
export function extractAdReply(data: Record<string, any>, message: Record<string, any>): InboundAttribution | undefined {
  const contextInfo = [data?.contextInfo, ...Object.values(message ?? {}).map((node) =>
    node && typeof node === 'object' ? (node as Record<string, any>).contextInfo : undefined,
  )].find((ctx) => ctx && typeof ctx === 'object' && ctx.externalAdReply) as Record<string, any> | undefined;

  const adReply = contextInfo?.externalAdReply as Record<string, any> | undefined;
  if (!adReply) return undefined;

  const sourceUrl: string | undefined = adReply.sourceUrl ?? undefined;
  // ctwaClid is sometimes a first-class field and sometimes only present as a
  // query param on sourceUrl — read both, preferring the explicit field.
  let ctwaClid: string | undefined = adReply.ctwaClid ?? contextInfo?.ctwaClid ?? undefined;
  if (!ctwaClid && sourceUrl) {
    try {
      ctwaClid = new URL(sourceUrl).searchParams.get('ctwa_clid') ?? undefined;
    } catch {
      // Not a parseable URL — nothing to recover, keep ctwaClid undefined.
    }
  }

  const adId: string | undefined = adReply.sourceId ? String(adReply.sourceId) : undefined;
  if (!adId && !ctwaClid) return undefined; // an ad reply with no identifier is not attributable

  return {
    adId,
    adTitle: adReply.title ?? undefined,
    adUrl: adReply.mediaUrl ?? sourceUrl,
    adSourceApp: adReply.sourceApp ?? contextInfo?.entryPointConversionApp ?? undefined,
    ctwaClid,
    // `sourceType` is 'ad' for paid placements and 'post' for organic ones, so a
    // shared post is correctly NOT counted as paid media.
    kind: adReply.sourceType === 'post' ? 'direct_social' : 'paid_ad',
  };
}

/**
 * Provider id of the message this one quotes (WhatsApp "responder"). Baileys
 * puts `contextInfo.stanzaId` on whichever node carries the content
 * (extendedTextMessage, imageMessage, ...); Evolution v2 also mirrors it at
 * `data.contextInfo`. Reads both.
 */
function extractQuotedId(data: Record<string, any>, message: Record<string, any>): string | undefined {
  const fromData = data.contextInfo?.stanzaId;
  if (fromData) return String(fromData);
  for (const node of Object.values(message ?? {})) {
    const stanzaId = node && typeof node === 'object' ? (node as Record<string, any>).contextInfo?.stanzaId : undefined;
    if (stanzaId) return String(stanzaId);
  }
  return undefined;
}

/**
 * The `interactiveMessage` node of a native-flow message, if this is one. Baileys
 * sends those inside a view-once envelope (Evolution's sendButtons does, and so
 * does the WhatsApp Business app), sometimes under an ephemeral one too — so up
 * to a few wrappers are peeled off. Only interactive content is looked for: a
 * view-once photo stays unhandled, as before.
 */
function unwrapInteractive(message: Record<string, any>): Record<string, any> | undefined {
  let node: Record<string, any> | undefined = message;
  for (let depth = 0; node && depth < 4; depth++) {
    if (node.interactiveMessage) return node.interactiveMessage;
    node = node.viewOnceMessage?.message ?? node.viewOnceMessageV2?.message ?? node.viewOnceMessageV2Extension?.message ?? node.ephemeralMessage?.message;
  }
  return undefined;
}

/**
 * The Pix key on WhatsApp's own Pix card — the `payment_info` button the
 * WhatsApp Business app sends from the phone. Its params are a JSON string;
 * the key itself is in `payment_settings[].pix_static_code`.
 */
function extractPix(interactive: Record<string, any>): PixMessageMeta | undefined {
  const buttons: unknown[] = interactive.nativeFlowMessage?.buttons ?? [];
  for (const button of buttons as Array<Record<string, any>>) {
    if (button?.name !== 'payment_info' || typeof button.buttonParamsJson !== 'string') continue;
    let params: Record<string, any>;
    try {
      params = JSON.parse(button.buttonParamsJson);
    } catch {
      continue;
    }
    const settings: Array<Record<string, any>> = Array.isArray(params?.payment_settings) ? params.payment_settings : [];
    const pix = settings.find((s) => s?.type === 'pix_static_code')?.pix_static_code;
    if (!pix?.key) continue;
    return {
      merchant_name: String(pix.merchant_name ?? ''),
      key: String(pix.key),
      key_type: pixKeyTypeFromWire(pix.key_type),
      variant: 'native',
    };
  }
  return undefined;
}

/** One `messages.upsert` envelope, already normalized, plus the direction flag
 *  the two public parsers below discriminate on. */
interface ParsedEnvelope {
  /** True when WhatsApp says WE sent this — either through the platform (an
   *  echo of our own send) or from the phone/WhatsApp Web directly. */
  fromMe: boolean;
  message: NormalizedInbound;
}

/**
 * Shared across v1 and v2 — the inbound webhook envelope is near-identical
 * between versions, and identical in both directions (`key.fromMe` is the only
 * thing that distinguishes them). Returns null for anything we don't handle
 * (non-message events, non-text without handled media), so the orchestrator
 * simply drops it.
 */
function parseMessageEnvelope(rawBody: unknown): ParsedEnvelope | null {
  const body = (rawBody ?? {}) as Record<string, any>;

  if (body.event !== 'messages.upsert') return null;

  const instance = body.instance;
  const data = body.data ?? {};
  const key = data.key ?? {};

  const fromMe = key.fromMe === true;

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

  // Interactive cards: a Pix card becomes its plain-text form plus `pix` (the
  // timeline draws the card from that); any other card keeps its body text —
  // that includes the echo of our own branded Pix card, whose row the send
  // pipeline then completes (patchOutboundAttribution).
  const interactive = unwrapInteractive(msg);
  const pix = interactive ? extractPix(interactive) : undefined;
  const interactiveText: string | undefined = pix
    ? pixMessageText(pix)
    : (typeof interactive?.body?.text === 'string' ? interactive.body.text.trim() || undefined : undefined);

  const rawText: string | undefined =
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    caption ??
    interactiveText ??
    (mediaNode ? MEDIA_PLACEHOLDER[mediaNode.kind] : undefined);

  // Origin signals, resolved before the text is normalized. A Meta ad reply wins
  // over a site `[ref:]` token: an ad click is a stronger, first-party claim than
  // a token that could be copied from any link.
  const adAttribution = extractAdReply(data, msg);
  const { ref, cleanText } = rawText ? extractRefToken(rawText) : { ref: undefined, cleanText: rawText };
  const attribution: InboundAttribution | undefined =
    adAttribution ?? (ref ? { ref, kind: 'website' } : undefined);

  // The `[ref:]` token is stripped here and never persisted, so it shows up in
  // neither the conversation timeline nor the agent's context.
  const text = cleanText;

  if (!text || !instance || !key.id) {
    // Diagnostic: a message arrived but produced no text/media we handle — log
    // its type keys so an unrecognized WhatsApp message type (e.g. location,
    // contact card, poll) can be identified and added rather than silently dropped.
    // Echoes too: what the team sends from the phone was vanishing without a trace.
    if (data.message) {
      logger.info({ instance, fromMe, messageTypes: Object.keys(data.message) }, '[evolution] message dropped — no handled text/media');
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
    fromMe,
    message: {
      channel: 'whatsapp',
      instance: String(instance),
      externalContactId,
      // pushName is frequently empty (known Evolution/Baileys issue); fall back to
      // the business/notify name so fewer contacts land without any name at all.
      // On an echo these name the OUR side, not the customer — dropped below.
      contactName: data.pushName ?? data.verifiedBizName ?? data.notifyName ?? undefined,
      providerMessageId: String(key.id),
      text: String(text),
      tsSec: typeof data.messageTimestamp === 'number' ? data.messageTimestamp : undefined,
      media,
      pendingMedia,
      isGroup: isGroup || undefined,
      // Groups only: who actually sent this message. key.participant is the
      // sender's JID and pushName is their display name — kept per-message so the
      // UI can attribute it, since the conversation contactName is the group
      // subject (set downstream in EvolutionChannelConnector).
      senderParticipant: isGroup
        ? (String(key.participant ?? '').replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '') || undefined)
        : undefined,
      senderName: isGroup ? (data.pushName ?? undefined) : undefined,
      attribution,
      quotedProviderMessageId: extractQuotedId(data, msg),
      pix,
    },
  };
}

/** A real message FROM the customer. Echoes of our own side are not inbound —
 *  they go through `parseOutboundEcho`. */
export function parseInbound(rawBody: unknown): NormalizedInbound | null {
  const parsed = parseMessageEnvelope(rawBody);
  if (!parsed || parsed.fromMe) return null;
  return parsed.message;
}

/**
 * A message WE sent, as WhatsApp echoes it back.
 *
 * Two things produce one: a reply typed in the platform (already persisted by
 * `onOutboundSent`, deduped downstream on `whatsapp_message_id`), and a reply
 * typed straight into the phone or WhatsApp Web on that number. The second is
 * the reason this exists at all — those were being discarded here, so a
 * conversation handled from a phone showed only the customer's half and every
 * per-attendant/response-time metric built on `messages` was reading a void.
 *
 * `contactName` is deliberately dropped: on an echo, pushName is OUR business
 * profile name, and letting it through would name the contact after ourselves.
 * Attribution signals are dropped for the same reason — an ad click is
 * something the customer did, never us.
 */
export function parseOutboundEcho(rawBody: unknown): NormalizedOutboundEcho | null {
  const parsed = parseMessageEnvelope(rawBody);
  if (!parsed || !parsed.fromMe) return null;

  const { channel, instance, externalContactId, providerMessageId, text, tsSec, media, pendingMedia, isGroup, quotedProviderMessageId, pix } =
    parsed.message;
  return { channel, instance, externalContactId, providerMessageId, text, tsSec, media, pendingMedia, isGroup, quotedProviderMessageId, pix };
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
