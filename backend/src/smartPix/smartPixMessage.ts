import { configService } from '../config/ConfigService.js';
import { formatPixKey, type PixDetails } from '../channels/pix.js';
import type { SmartPixData } from '../persistence/SmartPixRepository.js';
import { smartPixService, type SmartPixService } from './SmartPixService.js';

/**
 * "Chave Pix" as a Smart Pix link (PIX_CARD_STYLE=smart): the registered key
 * becomes a /pix/{token} link sent as ordinary text — the one form that reaches
 * the customer through Evolution 2.3.7, where every interactive button fails.
 * The key itself never goes in the message; the page shows and copies it.
 *
 * Calls SmartPixService directly. Never the POC admin route, never
 * SMART_PIX_ADMIN_KEY.
 */

/** The attendant gets this message as is: the key type is a Configurações
 *  matter, not a failure. */
export class SmartPixKeyNotSupportedError extends Error {}

const DOCUMENT_DIGITS: Partial<Record<PixDetails['key_type'], number>> = { cnpj: 14, cpf: 11 };

/**
 * pix_settings has no document column. For a CNPJ or CPF key the key is the
 * document, so it is shown formatted (38.230.659/0001-07). Any other key type
 * has no document to show, and none is made up.
 */
export function smartPixDataFromSettings(pix: PixDetails): SmartPixData {
  const digits = DOCUMENT_DIGITS[pix.key_type];
  if (!digits) {
    throw new SmartPixKeyNotSupportedError('O link Pix só funciona com chave CNPJ ou CPF. Nada foi enviado ao cliente.');
  }
  if (!new RegExp(`^\\d{${digits}}$`).test(pix.key)) {
    throw new SmartPixKeyNotSupportedError('A chave Pix cadastrada em Configurações está em formato inválido. Nada foi enviado ao cliente.');
  }
  return {
    merchantName: pix.merchant_name,
    document: formatPixKey(pix.key_type, pix.key),
    keyType: pix.key_type,
    pixKey: pix.key,
  };
}

/** PUBLIC_BASE_URL without trailing slashes. Required, and https only: the link
 *  goes to the customer as is. */
export function smartPixBaseUrl(): string {
  const raw = configService.get('PUBLIC_BASE_URL')?.trim();
  if (!raw) throw new Error('[smart-pix] PUBLIC_BASE_URL is not set');
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('[smart-pix] PUBLIC_BASE_URL is not a valid URL');
  }
  if (parsed.protocol !== 'https:') throw new Error('[smart-pix] PUBLIC_BASE_URL must be https');
  if (parsed.search || parsed.hash) throw new Error('[smart-pix] PUBLIC_BASE_URL must not carry a query or fragment');
  return raw.replace(/\/+$/, '');
}

/** The URL alone on the last line, so WhatsApp turns it into a link the way it
 *  did in the plain-text test; its preview comes from smart.html's OG tags. */
export function smartPixMessageText(merchantName: string, url: string): string {
  return `*Chave Pix · Lumina*\n\n${merchantName}\n\nAcesse o link abaixo para consultar e copiar a chave Pix:\n\n${url}`;
}

export interface SmartPixMessage {
  /** Unsigned: the caller signs it on the way out, like any text reply. */
  text: string;
  expiresAt: Date;
}

/** Everything is checked before the token exists, so a refusal leaves no row behind. */
export async function createSmartPixMessage(pix: PixDetails, service: SmartPixService = smartPixService): Promise<SmartPixMessage> {
  const data = smartPixDataFromSettings(pix);
  const base = smartPixBaseUrl();
  const { token, expiresAt } = await service.createToken(data);
  return { text: smartPixMessageText(data.merchantName, `${base}/pix/${token}`), expiresAt };
}
