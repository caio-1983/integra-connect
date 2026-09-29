/**
 * One-off backfill of lead origin (Meta click-to-WhatsApp) for conversations
 * that arrived while the parser missed plain-text ad clicks (it only read
 * `contextInfo` from the message node, never `data.contextInfo`).
 *
 * Re-reads each unattributed contact's FIRST inbound message from Evolution's
 * own store and runs the same `extractAdReply` + `recordAttribution` path as
 * live traffic. First-touch is enforced by the table's primary key, so running
 * it twice is harmless.
 *
 *   npx tsx src/scripts/backfillAttribution.ts --since 2026-09-01 --dry-run
 *   npx tsx src/scripts/backfillAttribution.ts --since 2026-09-01
 */
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { getEvolutionClient } from '../channels/evolution/evolutionClientInstance.js';
import { extractAdReply } from '../channels/evolution/inboundParser.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sinceArg = args[args.indexOf('--since') + 1];
const since = args.includes('--since') && sinceArg ? sinceArg : '2026-09-01';

async function main(): Promise<void> {
  const candidates = await conversationRepository.listUnattributedFirstInbound(`${since}T00:00:00-03:00`);
  console.log(`${candidates.length} contato(s) sem origem desde ${since}${dryRun ? ' (dry-run)' : ''}`);

  const evolution = getEvolutionClient();
  const byAd = new Map<string, { title?: string; n: number }>();
  let found = 0;
  let missing = 0;

  for (const c of candidates) {
    let record: Record<string, any> | null = null;
    try {
      record = await evolution.findMessageById(c.instance, c.providerMessageId);
    } catch (error) {
      console.warn(`  falha ao ler ${c.providerMessageId} em "${c.instance}": ${String(error).slice(0, 120)}`);
    }
    if (!record) { missing++; continue; }

    const attribution = extractAdReply(record, record.message ?? {});
    if (!attribution) continue;

    found++;
    const key = attribution.adId ?? `clid:${attribution.ctwaClid}`;
    const entry = byAd.get(key) ?? { title: attribution.adTitle, n: 0 };
    entry.n++;
    byAd.set(key, entry);

    if (!dryRun) await conversationRepository.recordAttribution(c.contactId, 'whatsapp', attribution, c.instance);
  }

  console.log(`\nDe anúncio: ${found} | sem registro na Evolution: ${missing} | orgânicos: ${candidates.length - found - missing}`);
  for (const [ad, { title, n }] of [...byAd].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${String(n).padStart(4)}  ${ad}  ${title ?? ''}`);
  }
  if (dryRun) console.log('\nNada gravado (dry-run).');
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
