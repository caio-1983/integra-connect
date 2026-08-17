/**
 * Site-origin tracking via a token in the prefilled wa.me message.
 *
 * The site links to
 *   https://wa.me/55XXXXXXXXX?text=Ol%C3%A1!%20[ref:lp-planos]
 * and the first inbound message therefore carries `[ref:lp-planos]`. We read the
 * token for attribution and STRIP it before the text is persisted or shown to
 * the AI, so it never appears in the conversation or in the agent's context.
 *
 * Why this and not a webchat widget: "Chat do Site" is still an
 * "Em construção" EmptyState, and a real widget is its own project (backend,
 * embed script, non-phone contact identity). This works today with nothing but a
 * link change on the site. The tradeoff is that the token is briefly visible in
 * the visitor's own WhatsApp composer before they hit send — accepted
 * explicitly by the team.
 */

/** `[ref:slug]` — letters, digits, dash, underscore, dot. Case-insensitive. */
const REF_TOKEN = /\[ref:([A-Za-z0-9._-]{1,64})\]/i;

export interface ExtractedRef {
  /** Normalized token, lowercased so mapping rules match predictably. */
  ref?: string;
  /** The message with the token removed and whitespace tidied. */
  cleanText: string;
}

/**
 * Extracts and removes the tracking token. Returns `cleanText` unchanged (and no
 * `ref`) when there is no token, which is the overwhelmingly common case — every
 * inbound message runs through this.
 *
 * If stripping the token would leave nothing at all (the visitor sent only the
 * token), the original text is kept: an empty message would be dropped by the
 * parser and the contact would silently vanish.
 */
export function extractRefToken(text: string): ExtractedRef {
  const match = text.match(REF_TOKEN);
  if (!match) return { cleanText: text };

  const stripped = text.replace(REF_TOKEN, '').replace(/\s{2,}/g, ' ').trim();
  return {
    ref: match[1].toLowerCase(),
    cleanText: stripped.length > 0 ? stripped : text,
  };
}
