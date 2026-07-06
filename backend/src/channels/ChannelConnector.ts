import type { ParsedChannelEvent } from './evolution/types.js';

/** Outbound media a human operator attaches to a reply. `base64` has no data:
 *  prefix. `mediatype` is the coarse WhatsApp kind; `mimetype` the exact type. */
export interface OutboundMediaPayload {
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  base64: string;
  fileName?: string;
  caption?: string;
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
  sendText(instance: string, to: string, text: string): Promise<{ providerMessageId?: string }>;
  /** Send a media reply (image/video/audio/document) back out through this channel. */
  sendMedia(instance: string, to: string, media: OutboundMediaPayload): Promise<{ providerMessageId?: string }>;
}
