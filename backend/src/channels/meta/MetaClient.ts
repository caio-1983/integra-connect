import { configService } from '../../config/ConfigService.js';
import { logger } from '../../logger/Logger.js';
import type { OutboundMediaPayload } from '../ChannelConnector.js';

/**
 * Meta Graph API client for Facebook Messenger and Instagram Direct.
 *
 * Both channels share one API surface: you POST to `/{page-id}/messages` with a
 * page access token, and Instagram routes through the Facebook Page linked to the
 * Instagram professional account. So a single client serves both, and the
 * "instance" throughout this backend is the Page ID / IG account ID.
 *
 * Tokens are configured per account via `META_PAGE_TOKENS`, a JSON map of
 * `{ "<page-or-ig-id>": "<page access token>" }` — page tokens are per-page by
 * nature, and hardcoding a single one would cap the product at one Meta account.
 */

const GRAPH_VERSION = 'v21.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/** Parsed once — a malformed map should fail loudly at first use, not per message. */
let tokenCache: Record<string, string> | null = null;

function pageTokens(): Record<string, string> {
  if (tokenCache) return tokenCache;
  const raw = configService.get('META_PAGE_TOKENS');
  if (!raw) {
    tokenCache = {};
    return tokenCache;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    tokenCache = parsed;
    return parsed;
  } catch {
    throw new Error('[meta] META_PAGE_TOKENS não é um JSON válido. Esperado: {"<page_id>":"<token>"}');
  }
}

function tokenFor(instance: string): string {
  const token = pageTokens()[instance];
  if (!token) {
    // Named explicitly because the fix is a config change, and a generic 401 from
    // Graph would send someone hunting in the wrong place.
    throw new Error(`[meta] Sem token de página para a conta "${instance}". Adicione-a em META_PAGE_TOKENS.`);
  }
  return token;
}

/** Every account id this backend can send from — used to auto-register webhooks
 *  and to surface the accounts in the access-grant UI. */
export function configuredMetaAccounts(): string[] {
  return Object.keys(pageTokens());
}

async function graphPost(instance: string, path: string, body: Record<string, unknown>): Promise<Record<string, any>> {
  const url = `${GRAPH_BASE}/${path}?access_token=${encodeURIComponent(tokenFor(instance))}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) {
    // Graph puts the useful part in error.message; the HTTP status alone is
    // almost never enough to tell a bad token from an expired 24h window.
    const detail = json?.error?.message ?? `HTTP ${response.status}`;
    logger.warn({ instance, path, detail }, '[meta] graph request failed');
    throw new Error(`[meta] ${detail}`);
  }
  return json;
}

export const metaClient = {
  /**
   * Sends a text message. `to` is the PSID (Messenger) or IGSID (Instagram) —
   * scoped ids that only mean anything to the page that received them, which is
   * why they're stored on the contact rather than derived.
   */
  async sendText(instance: string, to: string, text: string): Promise<{ providerMessageId?: string }> {
    const json = await graphPost(instance, `${instance}/messages`, {
      recipient: { id: to },
      messaging_type: 'RESPONSE',
      message: { text },
    });
    return { providerMessageId: json.message_id ?? undefined };
  },

  /**
   * Sends media by URL.
   *
   * Graph accepts either a public URL or a multipart upload; it does NOT accept
   * base64 in the JSON body the way Evolution does. Our own copy is already
   * stored in a public bucket before sending (see requestManualMediaReply), so
   * the URL path is both simpler and avoids re-uploading the same bytes twice.
   */
  async sendMediaByUrl(instance: string, to: string, media: OutboundMediaPayload & { url: string }): Promise<{ providerMessageId?: string }> {
    const json = await graphPost(instance, `${instance}/messages`, {
      recipient: { id: to },
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          // Graph's attachment types are a smaller set than ours: anything that
          // isn't image/video/audio is a file.
          type: media.mediatype === 'document' ? 'file' : media.mediatype,
          payload: { url: media.url, is_reusable: false },
        },
      },
    });
    return { providerMessageId: json.message_id ?? undefined };
  },

  /** Display name for a sender, so contacts don't land as a bare numeric id.
   *  Best-effort: Instagram often withholds the profile, and a missing name must
   *  never block ingesting the message. */
  async fetchSenderName(instance: string, senderId: string): Promise<string | undefined> {
    try {
      const url = `${GRAPH_BASE}/${senderId}?fields=name,username&access_token=${encodeURIComponent(tokenFor(instance))}`;
      const response = await fetch(url);
      if (!response.ok) return undefined;
      const json = (await response.json()) as { name?: string; username?: string };
      return json.name ?? json.username ?? undefined;
    } catch {
      return undefined;
    }
  },
};
