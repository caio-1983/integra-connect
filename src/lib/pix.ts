/**
 * Pix key helpers — normalization, validation and display. The backend keeps
 * its own copy of the display rules (backend/src/channels/pix.ts) for the card
 * text it sends; keep both in step.
 */

export type PixKeyType = 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';

/** A Pix card, as stored on `messages.metadata.pix`. `branded` is the card the
 *  platform sends (Lumina logo); `native` is WhatsApp's own, sent from the phone. */
export interface PixCardData {
  merchantName: string;
  /** Normalized — exactly what "Copiar chave Pix" copies. */
  key: string;
  keyType: PixKeyType;
  variant: 'branded' | 'native';
  headerUrl?: string;
}

/** Header image of the branded card, served from `public/`. */
export const PIX_HEADER_IMAGE = '/pix-header-lumina.jpg';

export const PIX_KEY_TYPES: Array<{ value: PixKeyType; label: string; placeholder: string }> = [
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'email', label: 'E-mail', placeholder: 'financeiro@empresa.com.br' },
  { value: 'phone', label: 'Telefone', placeholder: '+55 (11) 99999-9999' },
  { value: 'random', label: 'Chave aleatória', placeholder: '123e4567-e89b-12d3-a456-426614174000' },
];

export function pixKeyTypeLabel(type: PixKeyType): string {
  return PIX_KEY_TYPES.find((t) => t.value === type)?.label ?? 'Chave';
}

const digits = (value: string) => value.replace(/\D/g, '');

/** What gets stored and copied: digits for CPF/CNPJ, `+55…` for phone. */
export function normalizePixKey(type: PixKeyType, raw: string): string {
  const value = raw.trim();
  switch (type) {
    case 'cnpj':
    case 'cpf':
      return digits(value);
    case 'phone': {
      const d = digits(value);
      return d ? `+${d.startsWith('55') && d.length >= 12 ? d : `55${d}`}` : '';
    }
    case 'email':
      return value.toLowerCase();
    case 'random':
      return value.toLowerCase();
  }
}

/** Error message for an invalid key, or null when it is valid. Expects a normalized key. */
export function validatePixKey(type: PixKeyType, key: string): string | null {
  switch (type) {
    case 'cnpj':
      return key.length === 14 ? null : 'O CNPJ precisa ter 14 dígitos.';
    case 'cpf':
      return key.length === 11 ? null : 'O CPF precisa ter 11 dígitos.';
    case 'phone':
      return /^\+55\d{10,11}$/.test(key) ? null : 'Informe o telefone com DDD.';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) ? null : 'E-mail inválido.';
    case 'random':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key) ? null : 'A chave aleatória tem o formato 123e4567-e89b-12d3-a456-426614174000.';
  }
}

/** The key as a person reads it: 38.230.659/0001-07. */
export function formatPixKey(type: PixKeyType, key: string): string {
  const d = digits(key);
  if (type === 'cnpj' && d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (type === 'cpf' && d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (type === 'phone' && d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    const local = d.slice(4);
    return `+55 (${d.slice(2, 4)}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
  }
  return key;
}

/** "CNPJ: 38.230.659/0001-07" */
export function pixKeyLine(card: Pick<PixCardData, 'key' | 'keyType'>): string {
  return `${pixKeyTypeLabel(card.keyType)}: ${formatPixKey(card.keyType, card.key)}`;
}

/** Last line of the caption under the logo; the key follows in its own message.
 *  Mirrors pixCaption in backend/src/channels/pix.ts. */
export const PIX_CAPTION_HINT = 'Copie a chave na mensagem abaixo.';

/** `messages.metadata.pix` (snake_case, as the backend writes it) → PixCardData. */
export function pixFromMetadata(metadata: unknown): PixCardData | null {
  const pix = (metadata as { pix?: Record<string, unknown> } | null)?.pix;
  if (!pix || typeof pix.key !== 'string') return null;
  return {
    merchantName: typeof pix.merchant_name === 'string' ? pix.merchant_name : '',
    key: pix.key,
    keyType: (pix.key_type as PixKeyType) ?? 'random',
    variant: pix.variant === 'native' ? 'native' : 'branded',
    headerUrl: typeof pix.header_url === 'string' ? pix.header_url : undefined,
  };
}
