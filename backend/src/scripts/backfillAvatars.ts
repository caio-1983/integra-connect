/**
 * One-off backfill of contact profile pictures for every WhatsApp contact.
 * New messages refresh pictures on their own (ContactAvatarService); this
 * covers the existing base. Contacts without a conversation are looked up
 * through --instance <name> (default: the first connected number). Contacts
 * checked in the last 7 days are skipped, so running it twice is harmless.
 *
 *   node dist/scripts/backfillAvatars.js --dry-run [--instance <name>]
 *   node dist/scripts/backfillAvatars.js [--instance <name>]
 */
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { AVATAR_TTL_MS, contactAvatarService } from '../conversation/ContactAvatarService.js';
import { getEvolutionClient } from '../channels/evolution/evolutionClientInstance.js';
import { toInstanceSummary } from '../channels/evolution/instanceSummary.js';

const dryRun = process.argv.includes('--dry-run');
const instanceArg = process.argv[process.argv.indexOf('--instance') + 1];
/** Pause between lookups so Evolution/WhatsApp aren't hammered. */
const DELAY_MS = 400;

/** Number used for contacts with no conversation: --instance <name>, else the first connected one. */
async function pickFallbackInstance(): Promise<string | undefined> {
  if (process.argv.includes('--instance')) return instanceArg;
  const instances = (await getEvolutionClient().fetchInstances()).map(toInstanceSummary);
  return instances.find((i) => i.connected)?.name;
}

async function main(): Promise<void> {
  const staleBefore = new Date(Date.now() - AVATAR_TTL_MS).toISOString();
  const fallbackInstance = await pickFallbackInstance();
  console.log(`Número para contatos sem conversa: ${fallbackInstance ?? '(nenhum conectado — ficam de fora)'}`);
  const candidates = await conversationRepository.listAvatarRefreshCandidates(staleBefore, fallbackInstance);
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
