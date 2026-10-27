import { configService } from '../../config/ConfigService.js';
import { logger } from '../../logger/Logger.js';
import { conversationRepository, type MetaAdCatalogRow } from '../../persistence/ConversationRepository.js';
import { GRAPH_BASE } from './MetaClient.js';

/**
 * Resolves Meta ad ids (from click-to-WhatsApp leads) into campaign / ad set /
 * ad names via the Marketing API, cached in `meta_ad_catalog`.
 *
 * Uses `META_ADS_TOKEN`: a System User token with `ads_read` on the business's
 * ad accounts. It is per ad account, not per WhatsApp number, so one token
 * covers every line. Without it, lookups are skipped and the lead keeps only
 * its raw ad id — attribution itself never depends on this.
 */

const FIELDS = 'name,effective_status,account_id,adset{id,name},campaign{id,name},creative{body}';
/**
 * Boosted posts get "Post do Instagram: …" (truncated) as ad, ad set and
 * campaign name; the readable name is the first line of the post text.
 */
const GENERIC_NAME = /^Post d[oa] (Instagram|Facebook)\b/i;
const MAX_POST_NAME = 80;

let warnedNoToken = false;

function adsToken(): string | null {
  const token = configService.get('META_ADS_TOKEN');
  if (!token && !warnedNoToken) {
    warnedNoToken = true;
    logger.warn('[meta-ads] META_ADS_TOKEN ausente — anúncios ficam só com o ID, sem nome de campanha');
  }
  return token ?? null;
}

function firstLineOfPost(body: unknown): string | null {
  if (typeof body !== 'string') return null;
  const line = body.split('\n').map(l => l.trim()).find(Boolean);
  if (!line) return null;
  return line.length > MAX_POST_NAME ? `${line.slice(0, MAX_POST_NAME - 1).trimEnd()}…` : line;
}

function toRow(adId: string, ad: Record<string, any>): MetaAdCatalogRow {
  const fromPost = firstLineOfPost(ad.creative?.body);
  const readable = (name: string | undefined) =>
    name && GENERIC_NAME.test(name) && fromPost ? fromPost : name ?? null;
  return {
    ad_id: adId,
    ad_name: readable(ad.name),
    ad_status: ad.effective_status ?? null,
    adset_id: ad.adset?.id ?? null,
    adset_name: readable(ad.adset?.name),
    campaign_id: ad.campaign?.id ?? null,
    campaign_name: readable(ad.campaign?.name),
    ad_account_id: ad.account_id ? `act_${ad.account_id}` : null,
    lookup_error: null,
  };
}

function failedRow(adId: string, error: string): MetaAdCatalogRow {
  return {
    ad_id: adId, ad_name: null, ad_status: null, adset_id: null, adset_name: null,
    campaign_id: null, campaign_name: null, ad_account_id: null, lookup_error: error.slice(0, 500),
  };
}

async function graphGet(path: string, token: string): Promise<{ ok: boolean; json: Record<string, any> }> {
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${GRAPH_BASE}/${path}${sep}access_token=${encodeURIComponent(token)}`);
  const json = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { ok: response.ok, json };
}

/**
 * Looks up the given ad ids and upserts one catalog row per id — resolved, or
 * with `lookup_error` so it is not retried on every message. Returns the rows.
 *
 * One request per id: Graph rejects `?ids=` ("deprecated in v26.0+").
 */
export async function lookupAds(adIds: string[]): Promise<MetaAdCatalogRow[]> {
  const token = adsToken();
  if (!token || adIds.length === 0) return [];

  const rows: MetaAdCatalogRow[] = [];
  for (const adId of adIds) {
    const single = await graphGet(`${adId}?fields=${FIELDS}`, token);
    rows.push(single.ok
      ? toRow(adId, single.json)
      : failedRow(adId, single.json?.error?.message ?? 'erro desconhecido'));
  }

  await conversationRepository.upsertAdCatalog(rows);
  return rows;
}

/**
 * Live path: called for each inbound ad click. Looks the ad up only the first
 * time its id is seen. Never throws — a Graph hiccup must not affect the message.
 */
export async function ensureAdCataloged(adId: string): Promise<void> {
  try {
    if (!adsToken() || await conversationRepository.hasCatalogedAd(adId)) return;
    const [row] = await lookupAds([adId]);
    if (row?.lookup_error) logger.warn({ adId, err: row.lookup_error }, '[meta-ads] ad lookup failed');
  } catch (error) {
    logger.warn({ adId, err: String(error) }, '[meta-ads] ad lookup failed');
  }
}
