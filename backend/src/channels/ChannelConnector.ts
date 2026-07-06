import type { ParsedChannelEvent } from './evolution/types.js';

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
}
