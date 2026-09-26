import type { CreateInstanceParams, EvolutionAdapter, QrResult, SendMediaParams, SendTextResult } from './types.js';

/** Evolution API v2.x — nested `webhook` object / flat sendText (verified against source `main`). */
export const v2Adapter: EvolutionAdapter = {
  major: 2,

  createInstanceBody(params: CreateInstanceParams): Record<string, unknown> {
    return {
      instanceName: params.instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        enabled: true,
        url: params.webhookUrl,
        byEvents: false,
        base64: true, // inline media (e.g. voice notes) in the webhook payload — no extra fetch needed
        events: params.events,
      },
    };
  },

  setWebhookBody(params: { url: string; events: string[] }): Record<string, unknown> {
    return {
      webhook: {
        enabled: true,
        url: params.url,
        byEvents: false,
        base64: true, // inline media (e.g. voice notes) in the webhook payload — no extra fetch needed
        events: params.events,
      },
    };
  },

  // v2: `quoted` is top-level; with no `message` Evolution looks it up by key.id.
  sendTextBody(params: { number: string; text: string; quotedId?: string }): Record<string, unknown> {
    return {
      number: params.number,
      text: params.text,
      ...(params.quotedId ? { quoted: { key: { id: params.quotedId } } } : {}),
    };
  },

  // v2: flat payload (verified against source `main` — same shape as sendText).
  sendMediaBody(params: SendMediaParams): Record<string, unknown> {
    return {
      number: params.number,
      mediatype: params.mediatype,
      mimetype: params.mimetype,
      media: params.media,
      fileName: params.fileName,
      caption: params.caption,
    };
  },

  parseQr(response: unknown): QrResult {
    const r = (response ?? {}) as Record<string, any>;
    const qr = r.qrcode ?? r;
    return { base64: qr?.base64, pairingCode: qr?.pairingCode, code: qr?.code };
  },

  parseSendResult(response: unknown): SendTextResult {
    const r = (response ?? {}) as Record<string, any>;
    return { providerMessageId: r?.key?.id };
  },
};
