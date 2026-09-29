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

const FIELDS = 'name,effective_status,account_id,adset{id,name},campaign{id,name}';
/** Graph's cap on ids per `?ids=` request. */
const BATCH = 50;

let warnedNoToken = false;

function adsToken(): string | null {
  const token = configService.get('META_ADS_TOKEN');
  if (!token && !warnedNoToken) {
    warnedNoToken = true;
    logger.warn('[meta-ads] META_ADS_TOKEN ausente — anúncios ficam só com o ID, sem nome de campanha');
  }
  return token ?? null;
}

function toRow(adId: string, ad: Record<string, any>): MetaAdCatalogRow {
  return {
    ad_id: adId,
    ad_name: ad.name ?? null,
    ad_status: ad.effective_status ?? null,
    adset_id: ad.adset?.id ?? null,
    adset_name: ad.adset?.name ?? null,
    campaign_id: ad.campaign?.id ?? null,
    campaign_name: ad.campaign?.name ?? null,
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
 * A `?ids=` batch fails as a whole when any single id is inaccessible, so a
 * failed batch falls back to one request per id to isolate the bad one.
 */
export async function lookupAds(adIds: string[]): Promise<MetaAdCatalogRow[]> {
  const token = adsToken();
  if (!token || adIds.length === 0) return [];

  const rows: MetaAdCatalogRow[] = [];
  for (let i = 0; i < adIds.length; i += BATCH) {
    const chunk = adIds.slice(i, i + BATCH);
    const batch = await graphGet(`?ids=${chunk.join(',')}&fields=${FIELDS}`, token);
    if (batch.ok) {
      for (const adId of chunk) {
        rows.push(batch.json[adId] ? toRow(adId, batch.json[adId]) : failedRow(adId, 'não retornado pela Graph API'));
      }
      continue;
    }
    for (const adId of chunk) {
      const single = await graphGet(`${adId}?fields=${FIELDS}`, token);
      rows.push(single.ok
        ? toRow(adId, single.json)
        : failedRow(adId, single.json?.error?.message ?? 'erro desconhecido'));
    }
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
