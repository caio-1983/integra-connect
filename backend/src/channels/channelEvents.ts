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

/** Channels a connector can produce. Mirrors the frontend's `ChannelType`
 *  (src/types/channel.ts); telegram/webchat remain stubs with no backend. */
export type ChannelName = 'whatsapp' | 'instagram' | 'facebook';

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

/**
 * Raw lead-origin signals carried by an inbound message.
 *
 * Only the raw values are transported — which CAMPAIGN they belong to is
 * resolved later, at read time, against the editable `campaign_mappings` rules
 * (see migration 20260810100100). Nothing here should ever be normalized into a
 * campaign id.
 */
export interface InboundAttribution {
  /** Meta ad id: `externalAdReply.sourceId` on WhatsApp, `referral.ad_id` on Meta. */
  adId?: string;
  adTitle?: string;
  /** Click-to-WhatsApp click id — the join key back to Meta Ads reporting. */
  ctwaClid?: string;
  metaCampaignName?: string;
  /** `[ref:...]` token from a wa.me link, or Meta's `referral.ref`. */
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
  /** Decided by which signals are present, not asserted by the channel. */
  kind: 'paid_ad' | 'website' | 'direct_social' | 'organic' | 'unknown';
}

/** Normalized, channel-agnostic inbound message (Evolution specifics already stripped). */
export interface InboundMessageReceivedPayload {
  provider: string;
  channel: string;
  instance: string;
  externalContactId: string;
  contactName?: string;
  /** Present only when the message actually carried origin signals. */
  attribution?: InboundAttribution;
  /** Group only: the individual sender's phone digits and display name. */
  senderParticipant?: string;
  senderName?: string;
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
  /** Operator who typed it (`fromType: 'human'` only) → `messages.sent_by`.
   *  Self-asserted by the frontend; attribution only, never authorization. */
  operatorId?: string;
  /** Attendant's display name, prefixed onto the text sent to the provider so
   *  the customer knows who is talking on a shared company number. Applied at
   *  send time only — the stored `messages.content` keeps the clean text
   *  (see channels/outboundSignature.ts). */
  signature?: string;
}

export interface OutboundMessageSentPayload {
  conversationId: string;
  /** Carried through so the persisted row records which channel it went out on
   *  — `messages.channel` defaults to 'whatsapp', which would be wrong for Meta. */
  channel: string;
  providerMessageId?: string;
  text: string;
  fromType: 'nina' | 'human';
  operatorId?: string;
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
