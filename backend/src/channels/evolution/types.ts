/** Evolution API version-adaptive contracts (Fase 1). Kept entirely inside channels/evolution — nothing above imports these. */

import type { MessageDeliveryStatus } from '../../types/messageStatus.js';

export type EvolutionMajor = 1 | 2;

export interface CreateInstanceParams {
  instanceName: string;
  webhookUrl: string;
  events: string[];
}

export interface QrResult {
  base64?: string;
  pairingCode?: string;
  code?: string;
}

export interface ConnectionStateResult {
  state: 'open' | 'connecting' | 'close' | 'unknown';
}

export interface SendTextResult {
  providerMessageId?: string;
}

/**
 * Per-version payload/endpoint differences live behind this interface. The
 * `EvolutionClient` detects the major version once and delegates to the
 * matching adapter, so callers never branch on version.
 */
export interface EvolutionAdapter {
  readonly major: EvolutionMajor;
  createInstanceBody(params: CreateInstanceParams): Record<string, unknown>;
  setWebhookBody(params: { url: string; events: string[] }): Record<string, unknown>;
  sendTextBody(params: { number: string; text: string }): Record<string, unknown>;
  parseQr(response: unknown): QrResult;
  parseSendResult(response: unknown): SendTextResult;
}

/**
 * Raw shape of one entry from `GET /instance/fetchInstances`. Verified
 * directly against a live Evolution v2.3.7 server: it returns a FLAT object
 * (`name`/`connectionStatus`/`ownerJid`/`profilePicUrl`) — not the
 * `{instance:{instanceName,owner,...}}` wrapper the official OpenAPI example
 * documents. Both shapes are accepted defensively; the flat one is primary
 * since that's what a real deployed server actually sends.
 */
export interface RawFetchedInstance {
  name?: string;
  connectionStatus?: 'open' | 'close' | 'connecting';
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  instance?: {
    instanceName: string;
    instanceId?: string;
    owner?: string; // JID, e.g. "5511999999999@s.whatsapp.net" — absent if never connected
    profileName?: string;
    profilePictureUrl?: string | null;
    status: 'open' | 'close' | 'connecting';
  };
}

/**
 * Raw shape of one entry from `POST /chat/findContacts/{instance}` (v2 only —
 * verified against Evolution's own docs/GitHub issues, not the OpenAPI spec,
 * which doesn't document this route). `pushName` is frequently empty (known
 * upstream issue) and `isGroup` distinguishes group JIDs from real contacts.
 */
export interface RawContact {
  id?: string;
  remoteJid?: string;
  pushName?: string | null;
  profilePicUrl?: string | null;
  isGroup?: boolean;
}

/** Raw shape of `GET /group/findGroupInfos/{instance}?groupJid=...` (v2 only). */
export interface RawGroupInfo {
  subject?: string;
  participants?: { id?: string; phoneNumber?: string; admin?: string | null }[];
}

/** Normalized instance summary — the only shape the frontend ever sees (Sprint 012). */
export interface InstanceSummary {
  name: string;
  number?: string;
  status: 'open' | 'connecting' | 'close';
  connected: boolean;
  profileName?: string;
  profilePicture?: string;
}

/** Media kinds we ingest from inbound messages (playback/preview only — no transcription/OCR). */
export type InboundMediaKind = 'audio' | 'image' | 'video' | 'document' | 'sticker';

/** Inline media carried by an inbound message. */
export interface NormalizedInboundMedia {
  kind: InboundMediaKind;
  mimeType: string;
  base64: string;
  /** Original file name, for documents (shown as the download label). */
  fileName?: string;
}

/** Channel-agnostic shape produced by inboundParser and consumed by the ChannelOrchestrator. */
export interface NormalizedInbound {
  channel: 'whatsapp';
  instance: string;
  externalContactId: string; // sender phone digits, or the full group JID when isGroup
  contactName?: string;
  providerMessageId: string;
  text: string;
  tsSec?: number;
  media?: NormalizedInboundMedia;
  /** Set by the parser when media arrived WITHOUT inline base64 (the normal
   *  case — Evolution ships an encrypted `.enc` URL, not the bytes themselves,
   *  even with webhook.base64=true). The connector resolves this to `media` by
   *  calling getBase64FromMedia — kept out of the pure parser. */
  pendingMedia?: { kind: InboundMediaKind; mimeType: string; fileName?: string };
  /** Group messages are persisted (visible in the queue) but never auto-replied to by the AI — see ConversationService. */
  isGroup?: boolean;
}

/** Channel-agnostic delivery-status change (Evolution's messages.update). */
export interface NormalizedStatusUpdate {
  channel: 'whatsapp';
  instance: string;
  providerMessageId: string;
  status: MessageDeliveryStatus;
}

/** Discriminated union returned by a connector's parseEvent — lets the
 * orchestrator route to the right downstream event without knowing anything
 * about the channel's raw payload shape. */
export type ParsedChannelEvent =
  | { kind: 'message'; data: NormalizedInbound }
  | { kind: 'status'; data: NormalizedStatusUpdate };
