/**
 * Fills `meta_ad_catalog` for every ad id already in lead attribution — the
 * backlog before live lookups existed, plus retries of failed lookups.
 *
 *   npx tsx src/scripts/syncMetaAdCatalog.ts              # ids never looked up
 *   npx tsx src/scripts/syncMetaAdCatalog.ts --retry      # + ids that failed before
 *   npx tsx src/scripts/syncMetaAdCatalog.ts --refresh    # all ids (campaigns renamed)
 */
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { lookupAds } from '../channels/meta/MetaAdsCatalog.js';
import { configService } from '../config/ConfigService.js';

const args = process.argv.slice(2);
const mode = args.includes('--refresh') ? 'all' : args.includes('--retry') ? 'retryFailed' : 'missing';

async function main(): Promise<void> {
  if (!configService.get('META_ADS_TOKEN')) {
    console.error('META_ADS_TOKEN não configurado no backend/.env');
    process.exit(1);
  }

  const adIds = await conversationRepository.listAdIdsForCatalog(mode);
  console.log(`${adIds.length} anúncio(s) para consultar (${mode})`);
  const rows = await lookupAds(adIds);

  const failed = rows.filter((r) => r.lookup_error);
  const byCampaign = new Map<string, string[]>();
  for (const r of rows) {
    if (r.lookup_error) continue;
    const key = r.campaign_name ?? '(sem campanha)';
    byCampaign.set(key, [...(byCampaign.get(key) ?? []), `${r.ad_name ?? r.ad_id} · ${r.adset_name ?? ''}`]);
  }

  for (const [campaign, ads] of byCampaign) {
    console.log(`\n${campaign}`);
    for (const ad of ads) console.log(`   ${ad}`);
  }
  console.log(`\nResolvidos: ${rows.length - failed.length} | falharam: ${failed.length}`);
  for (const r of failed) console.log(`   ${r.ad_id}  ${r.lookup_error}`);
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
