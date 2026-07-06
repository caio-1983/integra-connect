import type { ChannelConnector, OutboundMediaPayload } from '../ChannelConnector.js';
import { parseInbound, parseStatusUpdate } from './inboundParser.js';
import { getEvolutionClient } from './evolutionClientInstance.js';

// Group subject (display name) isn't on the message event itself — fetched
// once per group and cached for the process lifetime (a rename won't be
// picked up until restart, an acceptable trade-off for avoiding an extra
// Evolution API call on every single group message).
const groupSubjectCache = new Map<string, string | undefined>();

async function resolveGroupSubject(instance: string, groupJid: string): Promise<string | undefined> {
  const cacheKey = `${instance}:${groupJid}`;
  if (groupSubjectCache.has(cacheKey)) return groupSubjectCache.get(cacheKey);
  const subject = await getEvolutionClient().fetchGroupSubject(instance, groupJid);
  groupSubjectCache.set(cacheKey, subject);
  return subject;
}

/** Evolution implementation of ChannelConnector — the only place the channel layer touches EvolutionClient/inboundParser. */
export const evolutionChannelConnector: ChannelConnector = {
  provider: 'evolution',

  async parseEvent(rawBody: unknown) {
    const message = parseInbound(rawBody);
    if (message) {
      // Group conversations should be labeled with the group's name, not
      // whoever happened to send the message — falls back to the sender's
      // pushName (already on `contactName`) if the group subject isn't
      // resolvable (upstream 404s are a known Evolution quirk).
      if (message.isGroup) {
        const subject = await resolveGroupSubject(message.instance, message.externalContactId);
        if (subject) message.contactName = subject;
      }
      // Media (audio/image/video/document/sticker) arrives as an encrypted URL
      // — decrypt to base64 here (async, so kept out of the pure parser). A
      // failure leaves the text/placeholder in place rather than dropping the
      // message. getBase64FromMedia is generic across all media types.
      if (message.pendingMedia) {
        const { kind, mimeType, fileName } = message.pendingMedia;
        const result = await getEvolutionClient().getBase64FromMedia(message.instance, message.providerMessageId);
        if (result?.base64) {
          message.media = { kind, mimeType: result.mimetype || mimeType, base64: result.base64, fileName };
        }
        delete message.pendingMedia;
      }
      return { kind: 'message', data: message };
    }

    const status = parseStatusUpdate(rawBody);
    if (status) return { kind: 'status', data: status };

    return null;
  },

  async sendText(instance: string, to: string, text: string) {
    return getEvolutionClient().sendText(instance, to, text);
  },

  async sendMedia(instance: string, to: string, media: OutboundMediaPayload) {
    return getEvolutionClient().sendMedia(instance, {
      number: to,
      mediatype: media.mediatype,
      mimetype: media.mimetype,
      media: media.base64,
      fileName: media.fileName,
      caption: media.caption,
    });
  },
};
