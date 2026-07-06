import type { MessageDeliveryStatus } from '../types/messageStatus.js';

/** Channel event names + payloads, all carried over the Sprint 010 EventBus (Ajuste 6). */

export const ChannelEvents = {
  InboundWebhookReceived: 'InboundWebhookReceived',
  InboundMessageReceived: 'InboundMessageReceived',
  OutboundMessageRequested: 'OutboundMessageRequested',
  OutboundMessageSent: 'OutboundMessageSent',
  MessageStatusUpdated: 'MessageStatusUpdated',
  ConversationCreated: 'ConversationCreated',
  ConversationUpdated: 'ConversationUpdated',
  // Defined for the multi-channel/handoff future — not emitted this pass (out of scope).
  ConversationAssigned: 'ConversationAssigned',
  ConversationClosed: 'ConversationClosed',
} as const;

/** Raw transport event published by the thin webhook — the only consumer is ChannelOrchestrator. */
export interface InboundWebhookReceivedPayload {
  provider: string;
  rawBody: unknown;
}

/** Media kinds carried by an inbound message (preview/playback only — no transcription/OCR). */
export type InboundMediaKind = 'audio' | 'image' | 'video' | 'document' | 'sticker';

/** Inline media carried by an inbound message. */
export interface InboundMedia {
  kind: InboundMediaKind;
  mimeType: string;
  base64: string;
  /** Original file name, for documents (shown as the download label). */
  fileName?: string;
}

/** Normalized, channel-agnostic inbound message (Evolution specifics already stripped). */
export interface InboundMessageReceivedPayload {
  provider: string;
  channel: string;
  instance: string;
  externalContactId: string;
  contactName?: string;
  providerMessageId: string;
  text: string;
  tsSec?: number;
  media?: InboundMedia;
  isGroup?: boolean;
}

export interface OutboundMessageRequestedPayload {
  provider: string;
  channel: string;
  instance: string;
  conversationId: string;
  to: string;
  text: string;
  fromType: 'nina' | 'human';
}

export interface OutboundMessageSentPayload {
  conversationId: string;
  providerMessageId?: string;
  text: string;
  fromType: 'nina' | 'human';
}

export interface MessageStatusUpdatedPayload {
  instance: string;
  providerMessageId: string;
  status: MessageDeliveryStatus;
}

export interface ConversationLifecyclePayload {
  conversationId: string;
  contactId: string;
}
