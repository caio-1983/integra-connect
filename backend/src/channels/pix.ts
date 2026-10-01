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
 * Which card goes out. `branded` (default) carries the logo; `native` is
 * WhatsApp's own Pix card — the fallback if some client turns out not to render
 * the branded one, switchable with `PIX_CARD_STYLE=native` and no code change.
 */
export function pixCardStyle(): 'branded' | 'native' {
  return (configService.get('PIX_CARD_STYLE') ?? '').toLowerCase() === 'native' ? 'native' : 'branded';
}

/**
 * Header image of the branded card. Evolution downloads it from this URL, so it
 * must be publicly reachable — by default the copy the frontend serves on the
 * same domain. Undefined sends the card without an image rather than failing.
 */
export function pixHeaderImageUrl(): string | undefined {
  const explicit = configService.get('PIX_HEADER_IMAGE_URL');
  if (explicit) return explicit;
  const base = configService.get('PUBLIC_BASE_URL');
  return base ? `${base.replace(/\/$/, '')}/pix-header-lumina.jpg` : undefined;
}
