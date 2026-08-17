import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { logger } from '../logger/Logger.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { getConnector } from '../channels/connectorRegistry.js';
import { applySignature } from '../channels/outboundSignature.js';
import { runAgentChat } from '../runtime/AgentRuntime.js';
import {
  ChannelEvents,
  type ConversationLifecyclePayload,
  type InboundMessageReceivedPayload,
  type MessageStatusUpdatedPayload,
  type OutboundMessageRequestedPayload,
  type OutboundMessageSentPayload,
} from '../channels/channelEvents.js';

const AGENT_ID = 'atendimento';

/**
 * The channel-agnostic conversation use-case (Ajuste 3). Subscribes to the
 * normalized inbound event and drives: persist (via repository) → mode gate →
 * runtime → request outbound. It never imports Evolution and never reads DB
 * status literals — persistence and status↔mode translation live entirely in
 * `ConversationRepository`. Wiring is via events, not direct calls (Ajuste 6).
 */
async function onInboundMessage(event: AppEvent): Promise<void> {
  const msg = event.payload as unknown as InboundMessageReceivedPayload;

  const { contactId } = await conversationRepository.findOrCreateContact(msg.channel, msg.externalContactId, msg.contactName, msg.isGroup);
  const { conversationId, created } = await conversationRepository.findOrCreateConversation(contactId, msg.instance, {
    channel: msg.channel,
    provider: msg.provider,
    isGroup: msg.isGroup,
  });

  const { inserted } = await conversationRepository.insertInboundMessage({
    conversationId,
    channel: msg.channel,
    providerMessageId: msg.providerMessageId,
    content: msg.text,
    tsSec: msg.tsSec,
    media: msg.media,
    // Attribute the sender in group threads (contactName is the group subject).
    sender: msg.isGroup ? { name: msg.senderName, phone: msg.senderParticipant } : undefined,
  });
  if (!inserted) return; // duplicate delivery — already handled

  const lifecycle: ConversationLifecyclePayload = { conversationId, contactId };
  await aiEventBus.publish({
    type: created ? ChannelEvents.ConversationCreated : ChannelEvents.ConversationUpdated,
    payload: lifecycle as unknown as Record<string, unknown>,
    timestamp: new Date(),
  });

  // Lead origin, recorded on first touch. Deliberately NOT behind the
  // `created && !isGroup` gate below: the write is idempotent by primary key, so
  // calling it whenever signals are present costs nothing and means a lead whose
  // very first message was in a group — or whose conversation was reopened — is
  // still attributed. Groups do carry ad clicks in practice.
  if (msg.attribution) {
    await conversationRepository.recordAttribution(contactId, msg.channel, msg.attribution, msg.instance);
  }

  // Lead is created only when a real person makes contact (first inbound → new
  // 1:1 conversation) — replaces the old contact-insert trigger that flooded
  // the CRM with a lead per imported contact. Groups never become leads.
  if (created && !msg.isGroup) {
    await conversationRepository.createLeadForContact(contactId, msg.contactName ?? msg.externalContactId);
  }

  // Groups are visible in the queue for manual handling, but the AI never
  // auto-replies in them — regardless of stored mode (defense in depth on
  // top of findOrCreateConversation defaulting new groups to 'human').
  if (msg.isGroup) {
    logger.info({ conversationId }, '[conversation] group message persisted; AI never auto-replies in groups');
    return;
  }

  // Fase 5 (minimal): only the autonomous mode auto-replies. A human/paused
  // conversation is persisted (now live in the inbox) but the AI stays silent.
  const mode = await conversationRepository.getConversationMode(conversationId);
  if (mode !== 'autonomous') {
    logger.info({ conversationId, mode }, '[conversation] inbound persisted; AI silent (mode != autonomous)');
    return;
  }

  const history = await conversationRepository.getRecentHistory(conversationId);
  const result = await runAgentChat(AGENT_ID, {
    conversationId,
    contactId,
    channel: msg.channel,
    messages: history,
  });

  const outbound: OutboundMessageRequestedPayload = {
    provider: msg.provider,
    channel: msg.channel,
    instance: msg.instance,
    conversationId,
    to: msg.externalContactId,
    text: result.content,
    fromType: 'nina',
  };
  await aiEventBus.publish({
    type: ChannelEvents.OutboundMessageRequested,
    payload: outbound as unknown as Record<string, unknown>,
    timestamp: new Date(),
  });
}

async function onOutboundSent(event: AppEvent): Promise<void> {
  const sent = event.payload as unknown as OutboundMessageSentPayload;
  await conversationRepository.insertOutboundMessage({
    conversationId: sent.conversationId,
    channel: sent.channel,
    providerMessageId: sent.providerMessageId,
    content: sent.text,
    fromType: sent.fromType,
    operatorId: sent.operatorId,
  });
}

/**
 * Entry point for a human operator's manual reply typed in the Workspace
 * (no fresh inbound event to read instance/phone from, unlike the AI path
 * above — resolved instead from what was stored on the conversation at
 * creation time). Reuses the exact same OutboundMessageRequested pipeline
 * the AI uses, so it goes out through the same connector/EventBus.
 */
export async function requestManualReply(conversationId: string, content: string, operatorId?: string): Promise<void> {
  const info = await conversationRepository.getConversationChannelInfo(conversationId);
  if (!info) {
    throw new Error('Conversa sem instância associada (anterior a este recurso, ou contato não encontrado).');
  }

  // Signed only on the wire: OutboundMessageService prefixes the attendant's
  // name onto what the provider receives, while the row we store keeps `content`
  // clean (authorship is already in messages.sent_by).
  const signature = operatorId ? await conversationRepository.getOperatorName(operatorId) : undefined;

  const outbound: OutboundMessageRequestedPayload = {
    provider: info.provider,
    channel: info.channel,
    instance: info.instance,
    conversationId,
    to: info.to,
    text: content,
    fromType: 'human',
    operatorId,
    signature,
  };
  await aiEventBus.publish({
    type: ChannelEvents.OutboundMessageRequested,
    payload: outbound as unknown as Record<string, unknown>,
    timestamp: new Date(),
  });
}

export interface ManualMediaReply {
  base64: string;
  mimeType: string;
  fileName?: string;
  caption?: string;
  /** Operator who sent the attachment → `messages.sent_by`. */
  operatorId?: string;
}

/** image/* → image, video/* → video, audio/* → audio, everything else → document. */
function mediaKindFromMime(mime: string): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

/**
 * Human operator's media reply (attachment) from the Workspace composer. Unlike
 * text (which flows through the OutboundMessageRequested event so the AI path
 * can share it), media is always human-initiated, so it's handled directly:
 * store our own copy → send via the resolved connector → persist the outbound
 * row (which the frontend renders via realtime). Still provider-agnostic — the
 * connector is resolved from the registry, never Evolution directly.
 */
export async function requestManualMediaReply(conversationId: string, media: ManualMediaReply): Promise<void> {
  const info = await conversationRepository.getConversationChannelInfo(conversationId);
  if (!info) {
    throw new Error('Conversa sem instância associada (anterior a este recurso, ou contato não encontrado).');
  }

  const connector = getConnector(info.provider);
  if (!connector) throw new Error('Conector de canal indisponível.');

  const kind = mediaKindFromMime(media.mimeType);
  // Store our own copy first (for the timeline), then send. A send failure
  // leaves only an orphan file (harmless) and no DB row, so nothing broken shows.
  const mediaUrl = await conversationRepository.storeOutboundMedia(conversationId, media.base64, media.mimeType, media.fileName);

  // Sign the caption, but only when there IS one: on Meta channels the caption
  // travels as its own message, so signing an absent caption would send the
  // customer a message containing nothing but a name.
  const signature = media.operatorId ? await conversationRepository.getOperatorName(media.operatorId) : undefined;
  const outgoingCaption = media.caption ? applySignature(media.caption, signature, info.channel) : media.caption;

  const { providerMessageId } = await connector.sendMedia(info.instance, info.to, {
    mediatype: kind,
    mimetype: media.mimeType,
    base64: media.base64,
    // Our stored copy's public URL — the only form Meta's Graph API accepts.
    url: mediaUrl,
    fileName: media.fileName,
    caption: outgoingCaption,
  });

  await conversationRepository.insertOutboundMediaMessage({
    conversationId,
    channel: info.channel,
    providerMessageId,
    content: media.caption ?? media.fileName ?? '',
    mediaUrl,
    mediaType: media.mimeType,
    dbType: kind,
    operatorId: media.operatorId,
  });
}

export interface StartConversationResult { conversationId: string; contactId: string; created: boolean; }

/**
 * Entry point for the Workspace's "Nova Conversa" — finds or creates the
 * contact/conversation ahead of any inbound message, so the operator can open
 * an empty thread and type the first message (routed via the same
 * requestManualReply/OutboundMessageRequested pipeline once they send it).
 */
export async function startConversation(instance: string, phone: string, name?: string): Promise<StartConversationResult> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) throw new Error('Número de telefone inválido.');

  // WhatsApp-only by construction — this flow starts from a phone number, and
  // Meta channels have no equivalent (you cannot open a Messenger/Instagram
  // thread with someone who hasn't messaged you first).
  const { contactId } = await conversationRepository.findOrCreateContact('whatsapp', digits, name);
  const { conversationId, created } = await conversationRepository.findOrCreateConversation(contactId, instance, {
    channel: 'whatsapp',
    provider: 'evolution',
  });
  return { conversationId, contactId, created };
}

async function onMessageStatusUpdated(event: AppEvent): Promise<void> {
  const update = event.payload as unknown as MessageStatusUpdatedPayload;
  await conversationRepository.updateMessageStatus(update.providerMessageId, update.status);
}

function register(): void {
  aiEventBus.on(ChannelEvents.InboundMessageReceived, onInboundMessage);
  aiEventBus.on(ChannelEvents.OutboundMessageSent, onOutboundSent);
  aiEventBus.on(ChannelEvents.MessageStatusUpdated, onMessageStatusUpdated);
}

register();
