/**
 * Batch version of the "Pedir para Lu" button on the deal panel: Lu reads the
 * conversation of every deal in the chosen stages (default Fechamento, Ganho,
 * Perdido) and fills the lead qualification (need,
 * budget, timeline, decider). Same rule as the button — a criterion the
 * attendant typed (`source: 'human'`) is never overwritten.
 *
 * By default it skips leads that already have a Lu or human qualification;
 * --requalify reads them again.
 *
 *   npx tsx src/scripts/qualifyLeads.ts --dry-run          (lists who would be read, no OpenAI call)
 *   npx tsx src/scripts/qualifyLeads.ts --limit 10
 *   npx tsx src/scripts/qualifyLeads.ts
 *   In the container: node dist/scripts/qualifyLeads.js [flags]
 *
 * Flags: --stages "Fechamento,Ganho,Perdido"  --limit N  --requalify  --since YYYY-MM-DD (only deals created from this day)
 *
 * It only calls the model directly — it never goes through the reply pipeline,
 * so no message is ever sent to a customer.
 */
import 'dotenv/config';
import { getSupabase } from '../persistence/supabaseClient.js';
import { qualifyLead } from '../conversation/LeadQualificationService.js';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');
const requalify = args.includes('--requalify');
const since = flag('--since');
const limit = flag('--limit') ? Number(flag('--limit')) : undefined;
const stages = (flag('--stages') ?? 'Fechamento,Ganho,Perdido').split(',').map((s) => s.trim()).filter(Boolean);

const CONCURRENCY = 3;
const PAGE = 1000;

interface Target { contactId: string; name: string; conversationId: string }

async function listTargets(): Promise<Target[]> {
  const supabase = getSupabase();

  const { data: stageRows, error: stageError } = await supabase.from('pipeline_stages').select('id, title');
  if (stageError) throw new Error(`failed to read stages: ${stageError.message}`);
  const stageIds = (stageRows ?? []).filter((s) => stages.includes(s.title as string)).map((s) => s.id as string);
  const missing = stages.filter((t) => !(stageRows ?? []).some((s) => s.title === t));
  if (missing.length) throw new Error(`etapa(s) não encontrada(s): ${missing.join(', ')}`);

  // Deals in the chosen stages → their contacts (one entry per contact).
  const contacts = new Map<string, { name: string; memory: any }>();
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from('deals')
      .select('contact_id, contact:contacts(name, call_name, client_memory)')
      .in('stage_id', stageIds)
      .not('contact_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (since) query = query.gte('created_at', `${since}T00:00:00-03:00`);
    const { data, error } = await query;
    if (error) throw new Error(`failed to read deals: ${error.message}`);
    for (const d of data ?? []) {
      const c = (d as any).contact;
      if (!contacts.has(d.contact_id as string)) {
        contacts.set(d.contact_id as string, { name: c?.name || c?.call_name || '(sem nome)', memory: c?.client_memory });
      }
    }
    if (!data || data.length < PAGE) break;
  }

  const pending = [...contacts].filter(([, c]) => {
    if (requalify) return true;
    const q = c.memory?.qualification ?? {};
    return Object.keys(q).length === 0;
  });

  // Most recently active conversation per contact (a contact has one per WhatsApp number).
  const convOf = new Map<string, string>();
  const ids = pending.map(([id]) => id);
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .in('contact_id', ids.slice(i, i + 150))
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(`failed to read conversations: ${error.message}`);
    for (const c of data ?? []) {
      if (c.contact_id && !convOf.has(c.contact_id)) convOf.set(c.contact_id, c.id);
    }
  }

  return pending
    .filter(([id]) => convOf.has(id))
    .map(([id, c]) => ({ contactId: id, name: c.name, conversationId: convOf.get(id)! }));
}

async function main() {
  const all = await listTargets();
  const targets = limit ? all.slice(0, limit) : all;
  console.log(`${all.length} leads em ${stages.join('/')} ${requalify ? '' : 'sem qualificação '}— lendo ${targets.length}.`);

  if (dryRun) {
    for (const t of targets) console.log(`  ${t.name}`);
    console.log('\n--dry-run: nada foi enviado à IA nem salvo.');
    return;
  }

  let done = 0, ok = 0, failed = 0;
  const scores: number[] = [];
  const queue = [...targets];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        const memory = await qualifyLead(t.conversationId) as any;
        const score = memory?.lead_profile?.qualification_score ?? 0;
        scores.push(score);
        ok++;
        console.log(`[${++done}/${targets.length}] ${t.name}: ${score}%`);
      } catch (err) {
        failed++;
        console.log(`[${++done}/${targets.length}] ${t.name}: falhou — ${err instanceof Error ? err.message : err}`);
      }
    }
  }));

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  console.log(`\nPronto: ${ok} qualificados (média ${avg}%), ${failed} falharam.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
