/**
 * One-off backfill of contact profile pictures for everyone who already has a
 * WhatsApp conversation. New messages refresh pictures on their own
 * (ContactAvatarService); this covers the existing base. Contacts checked in
 * the last 7 days are skipped, so running it twice is harmless.
 *
 *   npx tsx src/scripts/backfillAvatars.ts --dry-run
 *   npx tsx src/scripts/backfillAvatars.ts
 */
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { AVATAR_TTL_MS, contactAvatarService } from '../conversation/ContactAvatarService.js';

const dryRun = process.argv.includes('--dry-run');
/** Pause between lookups so Evolution/WhatsApp aren't hammered. */
const DELAY_MS = 400;

async function main(): Promise<void> {
  const staleBefore = new Date(Date.now() - AVATAR_TTL_MS).toISOString();
  const candidates = await conversationRepository.listAvatarRefreshCandidates(staleBefore);
  console.log(`${candidates.length} contato(s) sem foto recente${dryRun ? ' (dry-run)' : ''}`);
  if (dryRun) return;

  let updated = 0;
  let none = 0;
  let failed = 0;
  for (const [i, c] of candidates.entries()) {
    try {
      if ((await contactAvatarService.refresh(c.contactId, c.instance, c.phone)) === 'updated') updated++;
      else none++;
    } catch (error) {
      failed++;
      console.warn(`  falha em ${c.phone} ("${c.instance}"): ${String(error).slice(0, 120)}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${candidates.length}…`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\nCom foto: ${updated} | sem foto/privada: ${none} | falhas: ${failed}`);
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
