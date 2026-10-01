import { configService } from '../config/ConfigService.js';

/**
 * Prefixes a human reply with the attendant's name.
 *
 * Why this exists: a shared inbox answers from the COMPANY's number, so the
 * customer sees whatever name that WhatsApp line carries -- during the first
 * production trial every attendant's reply reached the customer as "Juliana",
 * because that is the number the customer had written to. Routing cannot fix
 * that: a WhatsApp thread lives on the number it started on, and replying from
 * a different line would start a different conversation. Signing the text is
 * the standard shared-inbox answer (Chatwoot, Zendesk, Intercom all do it).
 *
 * The signature is applied ONLY on the way out to the provider. The row stored
 * in `messages` keeps the clean text, because inside the app authorship is
 * already carried by `messages.sent_by` -- repeating the name in the bubble
 * would be noise, and it would also corrupt the AI's view of the conversation
 * history.
 */

/** `false` disables signing globally (env `OUTBOUND_SIGNATURE=off`). Default on. */
function isEnabled(): boolean {
  return (configService.get('OUTBOUND_SIGNATURE') ?? 'on').toLowerCase() !== 'off';
}

/**
 * WhatsApp renders `*text*` as bold; Messenger and Instagram do not, and would
 * show the asterisks literally. Hence the channel split rather than one format.
 */
export function applySignature(text: string, signature: string | undefined, channel: string): string {
  if (!signature || !isEnabled()) return text;

  const name = signature.trim();
  if (!name) return text;

  // Idempotence guard: never sign twice if a retry re-enters this path.
  if (text.startsWith(`*${name}*`) || text.startsWith(`${name}:`)) return text;

  const label = channel === 'whatsapp' ? `*${name}*` : `${name}:`;
  return text.trim().length === 0 ? label : `${label}\n${text}`;
}

/** The same signature for a card, which has no text to prefix — it goes in the
 *  card's footer line instead. Undefined when signing is off or there is no name. */
export function signatureFooter(signature: string | undefined): string | undefined {
  if (!signature || !isEnabled()) return undefined;
  return signature.trim() || undefined;
}
