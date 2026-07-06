import type { CreateInstanceParams, EvolutionAdapter, QrResult, SendTextResult } from './types.js';

/** Evolution API v1.x — flat/snake_case payloads (verified against source tag 1.8.2). */
export const v1Adapter: EvolutionAdapter = {
  major: 1,

  createInstanceBody(params: CreateInstanceParams): Record<string, unknown> {
    return {
      instanceName: params.instanceName,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: params.webhookUrl, // v1: webhook is a flat string URL
      webhook_by_events: false,
      webhook_base64: true, // inline media (e.g. voice notes) in the webhook payload — no extra fetch needed
      events: params.events,
    };
  },

  setWebhookBody(params: { url: string; events: string[] }): Record<string, unknown> {
    return {
      enabled: true,
      url: params.url,
      webhook_by_events: false,
      webhook_base64: true,
      events: params.events,
    };
  },

  sendTextBody(params: { number: string; text: string }): Record<string, unknown> {
    return { number: params.number, textMessage: { text: params.text } };
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
