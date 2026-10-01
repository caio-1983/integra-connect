import type { ParsedChannelEvent } from './evolution/types.js';
import type { PixDetails, PixMessageMeta } from './pix.js';

/** Outbound media a human operator attaches to a reply. `base64` has no data:
 *  prefix. `mediatype` is the coarse WhatsApp kind; `mimetype` the exact type. */
export interface OutboundMediaPayload {
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  base64: string;
  /** Public URL of the copy we already stored before sending. Meta's Graph API
   *  only accepts a URL or a multipart upload — never base64 in the JSON body —
   *  so this is what makes attachments possible there. Evolution ignores it and
   *  uses `base64`. */
  url?: string;
  fileName?: string;
  caption?: string;
}

export interface SendTextOptions {
  /** Provider id of the message this one replies to (WhatsApp "responder").
   *  A connector that can't quote simply sends the text unquoted. */
  quotedProviderMessageId?: string;
}

/**
 * The seam every channel implements (WhatsApp/Evolution this sprint;
 * Instagram/Telegram/Messenger/Webchat later). The orchestrator and outbound
 * service depend only on this interface — never on a concrete provider — so a
 * new channel is one new connector + one registry line, no runtime changes.
 */
export interface ChannelConnector {
  readonly provider: string;
  /** Raw provider webhook body → a channel-agnostic message or status event, or null to drop. */
  parseEvent(rawBody: unknown): Promise<ParsedChannelEvent | null>;
  /** Send a text reply back out through this channel. */
  sendText(instance: string, to: string, text: string, options?: SendTextOptions): Promise<{ providerMessageId?: string }>;
  /** Send a media reply (image/video/audio/document) back out through this channel. */
  sendMedia(instance: string, to: string, media: OutboundMediaPayload): Promise<{ providerMessageId?: string }>;
  /** Replace the text of a message we already sent. Optional: a channel with no
   *  edit API (Messenger/Instagram) leaves it out and the caller refuses the edit. */
  editText?(instance: string, providerMessageId: string, text: string): Promise<void>;
  /** Send the company's Pix key as a card the customer copies with one tap.
   *  Returns the card actually sent, so the stored row matches what the customer
   *  saw. Optional: a channel without interactive cards leaves it out. */
  sendPix?(instance: string, to: string, pix: PixDetails, options?: SendPixOptions): Promise<{ providerMessageId?: string; card: PixMessageMeta }>;
}

export interface SendPixOptions {
  /** Small line under the card — the attendant's name, since a card has no
   *  room for the `*Nome*` signature a text reply carries. */
  footer?: string;
}
