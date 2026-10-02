import { configService } from '../config/ConfigService.js';

/** Pix key types, as stored in `pix_settings.key_type`. */
export type PixKeyType = 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';

/** The company's Pix key as registered in Configurações (`pix_settings`). */
export interface PixDetails {
  merchant_name: string;
  /** Normalized: digits only for CPF/CNPJ, `+55…` for phone, lowercase e-mail. */
  key: string;
  key_type: PixKeyType;
}

/**
 * What `messages.metadata.pix` holds — the card the customer actually saw.
 * `branded` is ours (Lumina logo + copy button); `native` is WhatsApp's own
 * Pix card, which is what the WhatsApp Business app sends from the phone.
 */
export interface PixMessageMeta extends PixDetails {
  variant: 'branded' | 'native';
  header_url?: string;
}

const KEY_TYPE_LABEL: Record<PixKeyType, string> = {
  cnpj: 'CNPJ',
  cpf: 'CPF',
  email: 'E-mail',
  phone: 'Telefone',
  random: 'Chave aleatória',
};

export function pixKeyTypeLabel(type: PixKeyType): string {
  return KEY_TYPE_LABEL[type];
}

/** The key as a person reads it (38.230.659/0001-07); the stored form is what gets copied. */
export function formatPixKey(type: PixKeyType, key: string): string {
  const digits = key.replace(/\D/g, '');
  if (type === 'cnpj' && digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (type === 'cpf' && digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (type === 'phone' && digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const local = digits.slice(4);
    return `+55 (${digits.slice(2, 4)}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
  }
  return key;
}

/** "CNPJ: 38.230.659/0001-07" — the line under the merchant name on the card. */
export function pixKeyLine(pix: PixDetails): string {
  return `${pixKeyTypeLabel(pix.key_type)}: ${formatPixKey(pix.key_type, pix.key)}`;
}

/**
 * `messages.content` for a Pix card. The card itself is rendered from
 * `metadata.pix`; this text is what search, the AI's view of the conversation
 * and anything else reading plain content get instead.
 */
export function pixMessageText(pix: PixDetails): string {
  return `Chave Pix\n${pix.merchant_name}\n${pixKeyLine(pix)}`;
}

/** WhatsApp's `pix_static_code.key_type` (CNPJ, CPF, EMAIL, PHONE, EVP) → ours. */
export function pixKeyTypeFromWire(value: unknown): PixKeyType {
  switch (String(value ?? '').toUpperCase()) {
    case 'CNPJ': return 'cnpj';
    case 'CPF': return 'cpf';
    case 'EMAIL': return 'email';
    case 'PHONE': return 'phone';
    default: return 'random';
  }
}

/**
 * How the key goes out.
 *
 * `native` (default): WhatsApp's own Pix card — one message, merchant name,
 * key and a one-tap "Copiar chave Pix", exactly what the WhatsApp Business app
 * sends. No logo: the Pix icon is drawn by WhatsApp.
 *
 * `branded`: interactive card with the Lumina logo and a copy button. Tested in
 * production on 2026-10-01 and it did NOT render for the customer (WhatsApp Web:
 * "Não foi possível carregar a mensagem"; phone: nothing) — WhatsApp wants a
 * `biz` stanza node on interactive messages from a linked device, and neither
 * Evolution 2.3.7 nor its Baileys 7.0.0-rc.9 adds one.
 *
 * `plain`: logo with the details as caption, then the key alone in a second
 * message. Always arrives, but the user rejected the separate message.
 *
 * `smart`: one ordinary text with a Smart Pix link (/pix/{token}) to a page
 * that shows and copies the key; the key itself is not in the message. Plain
 * text links did arrive, on the phone and on WhatsApp Web, where every
 * interactive button failed. Only where the card would go (WhatsApp through
 * Evolution); other channels keep `plain`. See smartPix/smartPixMessage.ts.
 */
export function pixCardStyle(): 'plain' | 'branded' | 'native' | 'smart' {
  const style = (configService.get('PIX_CARD_STYLE') ?? '').toLowerCase();
  return style === 'branded' || style === 'plain' || style === 'smart' ? style : 'native';
}

/** Caption under the logo in the `plain` style. The key itself follows alone. */
export function pixCaption(pix: PixDetails): string {
  return `*Chave Pix*\n${pix.merchant_name}\n${pixKeyLine(pix)}\n\nCopie a chave na mensagem abaixo.`;
}

let headerImageCache: { url: string; base64: string } | undefined;

/**
 * The header image as base64, for channels that send media as bytes
 * (Evolution). Fetched once per process — it is a static asset. Undefined on
 * any failure: the caller then sends the caption as text instead of failing.
 */
export async function fetchPixHeaderImage(url: string): Promise<string | undefined> {
  if (headerImageCache?.url === url) return headerImageCache.base64;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const base64 = Buffer.from(await res.arrayBuffer()).toString('base64');
    headerImageCache = { url, base64 };
    return base64;
  } catch {
    return undefined;
  }
}

/**
 * The logo image (header of the branded card, image of the plain style). It
 * must be publicly reachable — by default the copy the frontend serves on the
 * same domain. Undefined sends without an image rather than failing.
 */
export function pixHeaderImageUrl(): string | undefined {
  const explicit = configService.get('PIX_HEADER_IMAGE_URL');
  if (explicit) return explicit;
  const base = configService.get('PUBLIC_BASE_URL');
  return base ? `${base.replace(/\/$/, '')}/pix-header-lumina.jpg` : undefined;
}
