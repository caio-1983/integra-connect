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

/** Inline media carried by an inbound message (audio only this pass — no transcription, just playback). */
export interface InboundMedia {
  kind: 'audio';
  mimeType: string;
  base64: string;
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
