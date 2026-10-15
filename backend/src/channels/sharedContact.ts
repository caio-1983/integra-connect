/**
 * Contact cards shared in a chat (WhatsApp "Contato"). Stored on
 * `messages.metadata.contacts` so the timeline draws the card; `content` holds
 * the plain-text form, for previews, search and the agent's context.
 * The frontend reads the same shape in src/lib/sharedContact.ts — keep both in step.
 */
export interface SharedContactPhone {
  /** As written on the card: "+55 11 99999-9999". */
  number: string;
  /** WhatsApp id (digits) when the card names one — the number to message. */
  wa_id?: string;
}

export interface SharedContact {
  name: string;
  phones: SharedContactPhone[];
}

/**
 * Phone numbers on a vCard. WhatsApp writes each as
 * `TEL;type=CELL;waid=5511999999999:+55 11 99999-9999` (sometimes prefixed
 * `item1.`) — the formatted value after the colon is kept for display, `waid`
 * for messaging, and either stands in for the other when missing.
 */
function vcardPhones(vcard: unknown): SharedContactPhone[] {
  if (typeof vcard !== 'string') return [];
  const phones: SharedContactPhone[] = [];
  for (const line of vcard.split(/\r?\n/)) {
    if (!/^(item\d+\.)?TEL[;:]/i.test(line)) continue;
    const value = line.slice(line.indexOf(':') + 1).trim();
    const waid = /waid=(\d+)/i.exec(line)?.[1];
    const number = value || (waid ? `+${waid}` : '');
    if (!number || phones.some((p) => p.number === number)) continue;
    phones.push(waid ? { number, wa_id: waid } : { number });
  }
  return phones;
}

/** The cards on a Baileys message: `contactMessage`, or `contactsArrayMessage` when several are shared at once. */
export function extractSharedContacts(message: Record<string, any>): SharedContact[] | undefined {
  const cards: Array<Record<string, any>> = message.contactMessage
    ? [message.contactMessage]
    : Array.isArray(message.contactsArrayMessage?.contacts) ? message.contactsArrayMessage.contacts : [];
  const contacts = cards.map((card) => ({
    name: String(card?.displayName ?? '').trim(),
    phones: vcardPhones(card?.vcard),
  }));
  return contacts.length ? contacts : undefined;
}

/** Plain-text form: "📇 Name" and its numbers, one block per card. */
export function sharedContactsText(contacts: SharedContact[]): string {
  return contacts
    .map((c) => [`📇 ${c.name || 'Contato'}`, ...c.phones.map((p) => p.number)].join('\n'))
    .join('\n\n');
}
