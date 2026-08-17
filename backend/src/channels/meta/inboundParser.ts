import type { InboundAttribution } from '../channelEvents.js';
import type { InboundMediaKind, NormalizedInbound } from '../evolution/types.js';
import { extractRefToken } from '../attributionToken.js';
import { MEDIA_PLACEHOLDER } from '../mediaPlaceholder.js';
import { logger } from '../../logger/Logger.js';

/**
 * Parser for Meta's Messenger / Instagram webhook envelope.
 *
 * Shape (both channels are identical here):
 *   { object: 'page' | 'instagram',
 *     entry: [{ id: '<page-or-ig-id>', messaging: [{ sender: {id}, recipient: {id},
 *               timestamp, message?: {...}, postback?: {...}, referral?: {...} }] }] }
 *
 * `entry[].id` is the account that RECEIVED the message and becomes our
 * `instance` — which is what keeps Meta conversations inside the existing
 * per-account access grants (see can_access_conversation).
 *
 * `NormalizedInbound` is reused rather than duplicated: it is already
 * channel-agnostic despite living under evolution/ (the `channel` field is what
 * distinguishes them), so the orchestrator needs no new branch.
 */

/** Attribution from Meta's `referral` block, present when the conversation
 *  started from an ad or an m.me link with a ref parameter. */
function extractReferral(referral: Record<string, any> | undefined, channel: string): InboundAttribution | undefined {
  if (!referral) return undefined;

  const adId: string | undefined = referral.ad_id ? String(referral.ad_id) : undefined;
  const ref: string | undefined = typeof referral.ref === 'string' ? referral.ref.toLowerCase() : undefined;
  if (!adId && !ref) return undefined;

  // `source` is 'ADS' for paid entry points and 'SHORTLINK'/'CUSTOMER_CHAT_PLUGIN'
  // for organic ones. Trusting ad_id alone would misclassify an organic m.me link
  // that happens to carry a ref.
  const isPaid = adId !== undefined || referral.source === 'ADS';

  return {
    adId,
    adTitle: referral.ads_context_data?.ad_title ?? undefined,
    ref,
    kind: isPaid ? 'paid_ad' : (channel === 'instagram' || channel === 'facebook' ? 'direct_social' : 'website'),
  };
}

/**
 * Meta attachment type → our media kind.
 *
 * Graph's set is coarser than ours: everything that isn't image/video/audio is
 * `file`. The types deliberately NOT mapped (`location`, `template`, `fallback`,
 * `story_mention`, `share`) carry no file to store, so treating them as media
 * would produce an empty attachment bubble.
 */
const ATTACHMENT_KIND: Record<string, InboundMediaKind> = {
  image: 'image',
  video: 'video',
  audio: 'audio',
  file: 'document',
};

/**
 * First attachment carrying a fetchable file.
 *
 * Only the first is taken: `messages` holds one row per message and the rest of
 * the pipeline (Evolution included) assumes at most one attachment. A message
 * with several files keeps the first and logs the drop rather than silently
 * losing them.
 */
function extractAttachment(message: Record<string, any>, instance: string): { kind: InboundMediaKind; url: string } | undefined {
  const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
  if (attachments.length === 0) return undefined;

  const usable = attachments
    .map((a: Record<string, any>) => {
      const kind = ATTACHMENT_KIND[String(a?.type)];
      const url: string | undefined = a?.payload?.url;
      return kind && url ? { kind, url } : undefined;
    })
    .filter((a): a is { kind: InboundMediaKind; url: string } => a !== undefined);

  if (usable.length === 0) {
    logger.info({ instance, types: attachments.map((a: Record<string, any>) => a?.type) }, '[meta] inbound attachment types not handled');
    return undefined;
  }
  if (usable.length > 1) {
    logger.info({ instance, count: usable.length }, '[meta] inbound message had multiple attachments — only the first is stored');
  }
  return usable[0];
}

/**
 * Returns null for anything we don't handle — delivery/read receipts, echoes of
 * our own sends, reactions, empty payloads — so the orchestrator drops it.
 */
export function parseMetaInbound(rawBody: unknown): NormalizedInbound | null {
  const body = (rawBody ?? {}) as Record<string, any>;

  // 'page' = Messenger, 'instagram' = Instagram Direct. Anything else is a
  // different Meta product subscribed to the same app.
  const channel = body.object === 'instagram' ? 'instagram' : body.object === 'page' ? 'facebook' : null;
  if (!channel) return null;

  const entry = Array.isArray(body.entry) ? body.entry[0] : undefined;
  const instance: string | undefined = entry?.id ? String(entry.id) : undefined;
  const event = Array.isArray(entry?.messaging) ? entry.messaging[0] : undefined;
  if (!instance || !event) return null;

  // `is_echo` marks our own outbound coming back. Without this guard every reply
  // we send would be re-ingested as an inbound message and loop.
  if (event.message?.is_echo === true) return null;

  const senderId: string | undefined = event.sender?.id ? String(event.sender.id) : undefined;
  if (!senderId) return null;

  const providerMessageId: string | undefined = event.message?.mid ? String(event.message.mid) : undefined;
  const attribution = extractReferral(event.referral ?? event.postback?.referral, channel);

  // Media arrives as a signed, short-lived CDN URL rather than bytes. The
  // connector downloads it (see MetaChannelConnector) — same split as Evolution's
  // `pendingMedia`, keeping the network call out of the pure parser.
  const attachment = event.message ? extractAttachment(event.message, instance) : undefined;

  // A bare referral with no text and no attachment happens when someone taps an
  // ad and lands in the thread without typing. There is nothing to persist, and
  // inventing placeholder text would pollute the conversation and the AI's
  // context — so it is dropped. The ad click is not lost: the referral repeats on
  // the first real message.
  const rawText: string | undefined = event.message?.text ?? (attachment ? MEDIA_PLACEHOLDER[attachment.kind] : undefined);
  if (!rawText) return null;

  const { ref: siteRef, cleanText } = extractRefToken(rawText);

  if (!providerMessageId) return null;

  return {
    pendingMediaUrl: attachment ? { kind: attachment.kind, url: attachment.url } : undefined,
    // `channel` is typed as the literal 'whatsapp' on NormalizedInbound because
    // Evolution was the only producer; widened here since the field is what the
    // whole pipeline branches on.
    channel: channel as NormalizedInbound['channel'],
    instance,
    externalContactId: senderId,
    providerMessageId,
    text: cleanText,
    tsSec: typeof event.timestamp === 'number' ? Math.floor(event.timestamp / 1000) : undefined,
    attribution: attribution ?? (siteRef ? { ref: siteRef, kind: 'website' } : undefined),
  };
}
