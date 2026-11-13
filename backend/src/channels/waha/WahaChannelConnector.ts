import type { ChannelConnector, OutboundMediaPayload, SendTextOptions } from '../ChannelConnector.js';
import { logger } from '../../logger/Logger.js';
import { parseWahaAck, parseWahaMessage, phoneOf, type WahaParsedMessage } from './inboundParser.js';
import { serializedMessageId, toChatId } from './WahaClient.js';
import { getWahaClient, wahaDirectory } from './wahaRuntime.js';

/** Session name for an instance; throws when the number is not on WAHA. */
async function sessionOf(instance: string): Promise<string> {
  const session = await wahaDirectory.sessionFor(instance);
  if (!session) throw new Error(`O número ${instance} não está conectado na WAHA.`);
  return session.name;
}

// Group names are not on the message event; fetched once per group per process.
const groupSubjectCache = new Map<string, string | undefined>();
async function groupSubject(session: string, groupJid: string): Promise<string | undefined> {
  const key = `${session}:${groupJid}`;
  if (!groupSubjectCache.has(key)) groupSubjectCache.set(key, await getWahaClient().groupSubject(session, groupJid));
  return groupSubjectCache.get(key);
}

// The chatId WhatsApp really uses for a typed number (Brazilian 9th digit),
// resolved once per number. Numbers that came from WhatsApp itself are already right.
const chatIdCache = new Map<string, string>();
async function chatIdFor(session: string, to: string): Promise<string> {
  if (to.includes('@')) return toChatId(to);
  const cached = chatIdCache.get(to);
  if (cached) return cached;
  let chatId = toChatId(to);
  try {
    const check = await getWahaClient().checkNumber(session, to);
    if (check.exists && check.chatId) chatId = toChatId(check.chatId);
  } catch (error) {
    logger.warn({ err: String(error) }, '[waha] number check failed — sending to the number as typed');
  }
  chatIdCache.set(to, chatId);
  return chatId;
}

/** Fills in what the pure parser left for us: the phone behind a bare `@lid`, and the media bytes. */
async function complete(parsed: WahaParsedMessage, session: string): Promise<boolean> {
  const { message } = parsed;
  if (parsed.unresolvedLid) {
    const phone = phoneOf(await getWahaClient().phoneForLid(session, parsed.unresolvedLid));
    if (!phone) {
      // Same rule as the Evolution side: a contact keyed by a lid would be a
      // duplicate of the real one the moment the phone shows up.
      logger.warn({ instance: message.instance }, '[waha] @lid with no known phone — message dropped');
      return false;
    }
    message.externalContactId = phone;
  }
  if (message.pendingMedia) {
    const { kind, mimeType, fileName } = message.pendingMedia;
    if (parsed.mediaUrl) {
      try {
        const file = await getWahaClient().downloadMedia(parsed.mediaUrl);
        message.media = { kind, mimeType: mimeType || file.mimetype || 'application/octet-stream', base64: file.base64, fileName };
      } catch (error) {
        logger.warn({ err: String(error), instance: message.instance }, '[waha] media download failed — keeping the placeholder');
      }
    }
    delete message.pendingMedia;
  }
  return true;
}

/** WAHA implementation of ChannelConnector (WhatsApp, GOWS engine). */
export const wahaChannelConnector: ChannelConnector = {
  provider: 'waha',

  async parseEvent(rawBody: unknown) {
    const parsed = parseWahaMessage(rawBody);
    if (parsed) {
      const body = rawBody as Record<string, any>;
      const session = String(body.session ?? '');
      if (!(await complete(parsed, session))) return null;
      const { message } = parsed;
      if (parsed.fromMe) {
        const { channel, instance, externalContactId, providerMessageId, text, tsSec, media, isGroup, quotedProviderMessageId, quoted, pix, contacts } = message;
        return { kind: 'echo', data: { channel, instance, externalContactId, providerMessageId, text, tsSec, media, isGroup, quotedProviderMessageId, quoted, pix, contacts } };
      }
      if (message.isGroup) {
        const subject = await groupSubject(session, message.externalContactId);
        if (subject) message.contactName = subject;
      }
      return { kind: 'message', data: message };
    }

    const status = parseWahaAck(rawBody);
    if (status) return { kind: 'status', data: status };
    return null;
  },

  async sendText(instance: string, to: string, text: string, options?: SendTextOptions) {
    const session = await sessionOf(instance);
    const chatId = await chatIdFor(session, to);
    // WAHA builds the quote from its full id, whose first part says whose message it was.
    const replyTo = options?.quotedProviderMessageId
      ? serializedMessageId(options.quotedFromMe === true, chatId, options.quotedProviderMessageId)
      : undefined;
    return getWahaClient().sendText(session, chatId, text, replyTo);
  },

  async sendMedia(instance: string, to: string, media: OutboundMediaPayload) {
    const session = await sessionOf(instance);
    const chatId = await chatIdFor(session, to);
    const kind = media.mediatype === 'image' ? 'image' : media.mediatype === 'video' ? 'video' : media.mediatype === 'audio' ? 'voice' : 'file';
    return getWahaClient().sendFile(session, kind, chatId, {
      mimetype: media.mimetype,
      filename: media.fileName ?? (kind === 'file' ? 'arquivo' : undefined),
      data: media.base64,
    }, media.caption);
  },

  async editText(instance: string, providerMessageId: string, text: string, to: string) {
    // Only our own messages are editable, so the id is `true_<chat>_<raw>`
    // (verified 2026-11-13: PUT with that id edits on the customer's phone).
    const session = await sessionOf(instance);
    const chatId = await chatIdFor(session, to);
    await getWahaClient().editText(session, chatId, serializedMessageId(true, chatId, providerMessageId), text);
  },

  // No Pix card through WAHA (interactive buttons are not reliable on GOWS):
  // Smart Pix goes as its usual text, the card styles fall back to plain messages.
  textOnlyPix: true,
};
