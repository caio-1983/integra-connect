import type { ChannelConnector, OutboundMediaPayload } from '../ChannelConnector.js';
import { parseMetaInbound } from './inboundParser.js';
import { metaClient } from './MetaClient.js';
import { logger } from '../../logger/Logger.js';

/**
 * Meta implementation of ChannelConnector, serving BOTH Facebook Messenger and
 * Instagram Direct — one Graph API, one page access token per account, so one
 * connector. The channel each message belongs to comes off the webhook envelope
 * (`object: 'page' | 'instagram'`), not from separate connectors.
 *
 * Registered under the single provider name `meta`, which is also the
 * `:provider` segment of the webhook URL.
 */

/**
 * Cap on an inbound attachment we will pull into memory.
 *
 * The download is unbounded on Meta's side and lands in a Buffer before going to
 * Storage, so without a ceiling a single large video could take the process down.
 * 25 MB comfortably covers Instagram/Messenger media limits.
 */
const MAX_INBOUND_MEDIA_BYTES = 25 * 1024 * 1024;

/** Default mimetype per kind, for when the CDN response omits Content-Type. */
const DEFAULT_MIME: Record<string, string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mpeg',
  document: 'application/octet-stream',
  sticker: 'image/webp',
};

/**
 * Downloads an inbound attachment to base64.
 *
 * Must happen on receipt: Meta's attachment URLs are signed and expire, so
 * storing the URL and fetching later would give a dead link. Never throws — a
 * failed download leaves the message as its text placeholder rather than dropping
 * the message entirely.
 */
async function downloadAttachment(url: string, kind: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn({ status: response.status, kind }, '[meta] attachment download failed');
      return null;
    }

    // Trust the declared length when present, but still measure after reading —
    // a missing or lying Content-Length must not bypass the cap.
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_INBOUND_MEDIA_BYTES) {
      logger.warn({ declared, kind }, '[meta] attachment exceeds size cap — skipped');
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_INBOUND_MEDIA_BYTES) {
      logger.warn({ bytes: buffer.byteLength, kind }, '[meta] attachment exceeds size cap after download — skipped');
      return null;
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0] || DEFAULT_MIME[kind] || 'application/octet-stream';
    return { base64: buffer.toString('base64'), mimeType };
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.message : String(error), kind }, '[meta] attachment download threw');
    return null;
  }
}

export const metaChannelConnector: ChannelConnector = {
  provider: 'meta',

  async parseEvent(rawBody: unknown) {
    const message = parseMetaInbound(rawBody);
    if (!message) return null;

    // Graph does not include the sender's name on the message event, so contacts
    // would otherwise land as a bare numeric PSID. Best-effort and never fatal:
    // Instagram frequently withholds the profile.
    const name = await metaClient.fetchSenderName(message.instance, message.externalContactId);
    if (name) message.contactName = name;

    if (message.pendingMediaUrl) {
      const { kind, url, fileName } = message.pendingMediaUrl;
      const downloaded = await downloadAttachment(url, kind);
      if (downloaded) {
        message.media = { kind, mimeType: downloaded.mimeType, base64: downloaded.base64, fileName };
      }
      delete message.pendingMediaUrl;
    }

    return { kind: 'message', data: message };
  },

  async sendText(instance: string, to: string, text: string) {
    return metaClient.sendText(instance, to, text);
  },

  /**
   * Sends an attachment by public URL.
   *
   * Graph accepts a URL or a multipart upload, never base64 in the JSON body the
   * way Evolution does — so this uses `media.url`, the public URL of the copy the
   * caller already stored before sending (requestManualMediaReply). If that URL is
   * missing there is nothing sendable, and failing loudly beats a silent no-op.
   *
   * Messenger cannot carry text and an attachment in one message, so a caption is
   * sent as a follow-up message. The attachment's id is the one returned, since
   * that is the message the operator actually meant to send.
   */
  async sendMedia(instance: string, to: string, media: OutboundMediaPayload) {
    if (!media.url) {
      logger.warn({ instance, mediatype: media.mediatype }, '[meta] sendMedia called without a public URL');
      throw new Error('Não foi possível enviar o anexo: os canais Meta exigem uma URL pública do arquivo.');
    }

    const result = await metaClient.sendMediaByUrl(instance, to, { ...media, url: media.url });

    if (media.caption?.trim()) {
      // Best-effort: the file already went out, so a failed caption must not make
      // the whole send look failed to the operator.
      try {
        await metaClient.sendText(instance, to, media.caption.trim());
      } catch (error) {
        logger.warn({ instance, err: error instanceof Error ? error.message : String(error) }, '[meta] attachment sent but caption failed');
      }
    }

    return result;
  },
};
