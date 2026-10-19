/**
 * One-off backfill of the first-message signal (migration 20261019150000) for
 * contacts that arrived before it was recorded: each unattributed contact's
 * first inbound text in a 1:1 conversation goes into
 * `contact_attribution.source_raw.first_message`, as 'unknown', through the
 * same `recordAttribution` as live traffic. Only contacts with NO attribution
 * row are touched (first touch), so running it twice is harmless.
 *
 * After it runs, a `first_message` rule registered in Campanhas re-attributes
 * those leads too, and repeated phrases show up under "Sinais ainda não
 * mapeados".
 *
 *   npx tsx src/scripts/backfillFirstMessage.ts --since 2026-09-01 --dry-run
 *   npx tsx src/scripts/backfillFirstMessage.ts --since 2026-09-01
 */
import { getSupabase } from '../persistence/supabaseClient.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sinceArg = args[args.indexOf('--since') + 1];
const since = args.includes('--since') && sinceArg ? sinceArg : '2026-09-01';

async function main(): Promise<void> {
  const supabase = getSupabase();
  const PAGE = 500;

  const conversations: Array<{ id: string; contact_id: string; metadata: Record<string, any> | null }> = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, contact_id, metadata')
      .gte('created_at', `${since}T00:00:00-03:00`)
      .order('created_at')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    conversations.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  // Oldest conversation per contact, 1:1 only.
  const firstByContact = new Map<string, { id: string; channel: string; instance?: string }>();
  for (const c of conversations) {
    if (c.metadata?.isGroup || firstByContact.has(c.contact_id)) continue;
    firstByContact.set(c.contact_id, { id: c.id, channel: String(c.metadata?.channel ?? 'whatsapp'), instance: c.metadata?.instance });
  }

  const contactIds = [...firstByContact.keys()];
  const attributed = new Set<string>();
  for (let i = 0; i < contactIds.length; i += 200) {
    const { data, error } = await supabase.from('contact_attribution').select('contact_id').in('contact_id', contactIds.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) attributed.add(row.contact_id);
  }

  const pending = contactIds.filter((id) => !attributed.has(id));
  console.log(`${pending.length} contato(s) sem origem desde ${since}${dryRun ? ' (dry-run)' : ''}`);

  const phrases = new Map<string, number>();
  let recorded = 0;
  for (const contactId of pending) {
    const conv = firstByContact.get(contactId)!;
    const { data } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conv.id)
      .eq('from_type', 'user')
      .order('created_at')
      .limit(1)
      .maybeSingle();
    const text = (data?.content as string | null)?.trim();
    if (!text) continue;

    const key = text.replace(/\s+/g, ' ').toLowerCase();
    phrases.set(key, (phrases.get(key) ?? 0) + 1);
    recorded++;
    if (!dryRun) {
      await conversationRepository.recordAttribution(contactId, conv.channel, { kind: 'unknown', firstMessage: text.slice(0, 500) }, conv.instance);
    }
  }

  console.log(`Primeira mensagem ${dryRun ? 'a gravar' : 'gravada'}: ${recorded}`);
  console.log('\nFrases repetidas (candidatas a regra, 20+ caracteres):');
  for (const [phrase, n] of [...phrases].filter(([p, n]) => n >= 2 && p.length >= 20).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(n).padStart(4)}  ${phrase.slice(0, 100)}`);
  }
  if (dryRun) console.log('\nNada gravado (dry-run).');
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
