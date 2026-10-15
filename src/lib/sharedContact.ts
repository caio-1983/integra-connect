/**
 * Contact cards shared in a chat (WhatsApp "Contato"), as stored on
 * `messages.metadata.contacts` by the backend (backend/src/channels/sharedContact.ts).
 */

export interface SharedContactPhone {
  /** As written on the card: "+55 11 99999-9999". */
  number: string;
  /** Digits to message — the card's WhatsApp id, else the number's digits. */
  digits: string;
}

export interface SharedContact {
  name: string;
  phones: SharedContactPhone[];
}

export function sharedContactsFromMetadata(metadata: unknown): SharedContact[] | null {
  const raw = (metadata as { contacts?: unknown } | null)?.contacts;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((c: Record<string, unknown>) => ({
    name: typeof c?.name === 'string' ? c.name : '',
    phones: (Array.isArray(c?.phones) ? c.phones : [])
      .filter((p: Record<string, unknown>) => typeof p?.number === 'string')
      .map((p: Record<string, unknown>) => ({
        number: p.number as string,
        digits: typeof p.wa_id === 'string' && p.wa_id ? p.wa_id : (p.number as string).replace(/\D/g, ''),
      })),
  }));
}

/** Name shown for a card — its number when the sender's phone had no name for it. */
export function sharedContactName(contact: SharedContact): string {
  return contact.name.trim() || contact.phones[0]?.number || 'Contato';
}

/** "e mais 2 contatos" — empty for a single card. */
export function sharedContactsMore(contacts: SharedContact[]): string {
  const rest = contacts.length - 1;
  return rest > 0 ? `e mais ${rest} ${rest === 1 ? 'contato' : 'contatos'}` : '';
}

/** "João", or "João e mais 2 contatos" — the preview line. */
export function sharedContactsSummary(contacts: SharedContact[]): string {
  return [sharedContactName(contacts[0]), sharedContactsMore(contacts)].filter(Boolean).join(' ');
}
