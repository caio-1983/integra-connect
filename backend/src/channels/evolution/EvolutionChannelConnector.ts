import type { ChannelConnector, OutboundMediaPayload, SendPixOptions, SendTextOptions } from '../ChannelConnector.js';
import { pixCardStyle, pixHeaderImageUrl, pixKeyLine, type PixDetails } from '../pix.js';
import { parseInbound, parseOutboundEcho, parseStatusUpdate } from './inboundParser.js';
import { getEvolutionClient } from './evolutionClientInstance.js';
import type { NormalizedInbound, NormalizedOutboundEcho } from './types.js';

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

/**
 * Media (audio/image/video/document/sticker) arrives as an encrypted URL —
 * decrypt to base64 here (async, so kept out of the pure parser). A failure
 * leaves the text/placeholder in place rather than dropping the message.
 * getBase64FromMedia is generic across all media types and both directions.
 */
async function resolvePendingMedia(message: NormalizedInbound | NormalizedOutboundEcho): Promise<void> {
  if (!message.pendingMedia) return;
  const { kind, mimeType, fileName } = message.pendingMedia;
  const result = await getEvolutionClient().getBase64FromMedia(message.instance, message.providerMessageId);
  if (result?.base64) {
    message.media = { kind, mimeType: result.mimetype || mimeType, base64: result.base64, fileName };
  }
  delete message.pendingMedia;
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
      await resolvePendingMedia(message);
      return { kind: 'message', data: message };
    }

    // Our own side of the conversation, echoed back — the attendant replying
    // from the phone instead of the platform. No group-subject lookup: an echo
    // only ever attaches to a conversation that already exists.
    const echo = parseOutboundEcho(rawBody);
    if (echo) {
      await resolvePendingMedia(echo);
      return { kind: 'echo', data: echo };
    }

    const status = parseStatusUpdate(rawBody);
    if (status) return { kind: 'status', data: status };

    return null;
  },

  async sendText(instance: string, to: string, text: string, options?: SendTextOptions) {
    return getEvolutionClient().sendText(instance, to, text, options?.quotedProviderMessageId);
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

  async editText(instance: string, providerMessageId: string, text: string) {
    await getEvolutionClient().updateMessage(instance, providerMessageId, text);
  },

  async sendPix(instance: string, to: string, pix: PixDetails, options?: SendPixOptions) {
    if (pixCardStyle() === 'native') {
      const { providerMessageId } = await getEvolutionClient().sendButtons(instance, {
        number: to,
        title: 'Chave Pix',
        buttons: [{ type: 'pix', currency: 'BRL', name: pix.merchant_name, keyType: pix.key_type, key: pix.key }],
      });
      return { providerMessageId, card: { ...pix, variant: 'native' as const } };
    }

    const headerUrl = pixHeaderImageUrl();
    const { providerMessageId } = await getEvolutionClient().sendButtons(instance, {
      number: to,
      title: 'Chave Pix',
      description: `${pix.merchant_name}\n${pixKeyLine(pix)}`,
      ...(options?.footer ? { footer: options.footer } : {}),
      ...(headerUrl ? { thumbnailUrl: headerUrl } : {}),
      buttons: [{ type: 'copy', displayText: 'Copiar chave Pix', copyCode: pix.key }],
    });
    return { providerMessageId, card: { ...pix, variant: 'branded' as const, ...(headerUrl ? { header_url: headerUrl } : {}) } };
  },
};
