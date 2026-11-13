import { wahaDirectory } from '../waha/wahaRuntime.js';
import { configService } from '../../config/ConfigService.js';
import { logger } from '../../logger/Logger.js';
import { aiEventBus } from '../../runtime/EventBus.js';
import { conversationRepository } from '../../persistence/ConversationRepository.js';
import { ChannelEvents, type InboundWebhookReceivedPayload } from '../channelEvents.js';
import { getEvolutionClient } from './evolutionClientInstance.js';
import { parseInbound, parseOutboundEcho } from './inboundParser.js';

/**
 * Safety net for WhatsApp messages the Evolution webhook never delivered.
 *
 * Evolution (Baileys) loses messages in ways our webhook cannot see: a session
 * stuck in a backlog for hours (04–09/11/2026), and history synced after a
 * re-pair, which lands in Evolution's own store but is never posted to the
 * webhook. Every RECONCILE_INTERVAL_MS this compares each connected number's
 * recent store (`findMessages`) with `messages` and stores what is missing:
 *  - thread already exists → `insertReconciledMessage` (in place, no bump unless
 *    it is the newest message);
 *  - no thread → re-published as the webhook event it should have been, so the
 *    live pipeline creates contact/conversation/lead exactly as it would have.
 *
 * A message must be found missing on two consecutive runs before it is stored,
 * so one still in flight through the live webhook is never raced.
 *
 * It also raises a bell notification to managers when a number is delivering
 * late or has gone silent in business hours — the symptom that otherwise
 * surfaces only when an attendant complains.
 */

const MIN = 60_000;
const interval = () => configService.getNumber('RECONCILE_INTERVAL_MS', 10 * MIN);
const lookbackSec = () => configService.getNumber('RECONCILE_LOOKBACK_HOURS', 72) * 3600;
const PAGE_SIZE = 500;
const MAX_PAGES = 40;
/** Missing on a run at least this long ago → no longer in flight. */
const GRACE_MS = 5 * MIN;
const MAX_PER_RUN = 300;

const LAG_ALERT_MIN = () => configService.getNumber('RECONCILE_LAG_ALERT_MIN', 15);
const SILENCE_ALERT_MIN = () => configService.getNumber('RECONCILE_SILENCE_ALERT_MIN', 90);
const ALERT_REPEAT_MS = 6 * 60 * MIN;
const ALERT_TYPE = 'whatsapp_delay';

/** provider message id → when it was first found missing. */
const firstMissing = new Map<string, number>();
/** Handled already (stored, handed to the live pipeline, or nothing to store) → when. */
const done = new Map<string, number>();
let running = false;

type Rec = Record<string, any>;

/** Business hours in the shop's timezone: Mon–Sat, 08:00–19:00. */
function businessHours(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', hour12: false })
    .formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return weekday !== 'Sun' && hour >= 8 && hour < 19;
}

async function recentRecords(instance: string, sinceSec: number): Promise<Rec[]> {
  const client = getEvolutionClient();
  const out: Rec[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { records, pages } = await client.findMessagesPage(instance, page, PAGE_SIZE);
    out.push(...records.filter((r) => Number(r.messageTimestamp) >= sinceSec));
    // Newest first: a page that ends before the window ends the scan.
    const oldest = Math.min(...records.map((r) => Number(r.messageTimestamp)));
    if (records.length === 0 || oldest < sinceSec || page >= pages) break;
  }
  return out;
}

/** LID JID → phone JID, from the records themselves and from findChats. */
async function lidMap(instance: string, records: Rec[], needChats: boolean): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const learn = (key: Rec | undefined) => {
    const a = String(key?.remoteJid ?? '');
    const b = String(key?.remoteJidAlt ?? '');
    if (a.endsWith('@lid') && b.endsWith('@s.whatsapp.net')) map.set(a, b);
    if (b.endsWith('@lid') && a.endsWith('@s.whatsapp.net')) map.set(b, a);
  };
  for (const r of records) learn(r.key);
  if (needChats) {
    for (const chat of await getEvolutionClient().findChats(instance)) learn(chat.lastMessage?.key);
  }
  return map;
}

/** The record as the webhook would have posted it: phone JID, no ephemeral wrapper. */
function asWebhookBody(instance: string, rec: Rec, phoneJid: string | undefined) {
  const key = phoneJid ? { ...rec.key, remoteJid: phoneJid, remoteJidAlt: phoneJid } : rec.key;
  const message = rec.message?.ephemeralMessage?.message ?? rec.message;
  return {
    event: 'messages.upsert',
    instance,
    data: { key, pushName: rec.pushName, message, messageTimestamp: Number(rec.messageTimestamp), contextInfo: rec.contextInfo },
  };
}

export interface ReconcileOptions {
  /** Report what would be done; writes nothing, notifies no one. */
  dryRun?: boolean;
  /** Override of GRACE_MS — 0 for a one-off manual run. */
  graceMs?: number;
  /** Only this number. */
  instance?: string;
}

async function reconcileInstance(instance: string, opts: ReconcileOptions): Promise<Record<string, number>> {
  const nowSec = Math.floor(Date.now() / 1000);
  const records = await recentRecords(instance, nowSec - lookbackSec());
  const byId = new Map<string, Rec>();
  for (const r of records) {
    const id = r.key?.id;
    if (!id || String(r.key?.remoteJid ?? '').includes('status@')) continue;
    if (!byId.has(id)) byId.set(id, r);
  }

  const stored = await conversationRepository.storedProviderMessages([...byId.keys()]);
  await checkHealth(instance, records, stored, opts);

  const now = Date.now();
  const grace = opts.graceMs ?? GRACE_MS;
  const due: Rec[] = [];
  for (const [id, rec] of byId) {
    if (stored.has(id) || done.has(id)) { firstMissing.delete(id); continue; }
    if (grace === 0) { due.push(rec); continue; }
    const first = firstMissing.get(id);
    if (first === undefined) { firstMissing.set(id, now); continue; }
    if (now - first >= grace) due.push(rec);
  }
  if (due.length === 0) return {};
  due.sort((a, b) => Number(a.messageTimestamp) - Number(b.messageTimestamp));

  const needChats = due.some((r) => String(r.key?.remoteJid ?? '').endsWith('@lid') && !String(r.key?.remoteJidAlt ?? '').endsWith('@s.whatsapp.net'));
  const lids = await lidMap(instance, records, needChats);

  const tally: Record<string, number> = {};
  const count = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
  const finish = (id: string, outcome: string) => {
    count(outcome);
    if (opts.dryRun) return;
    firstMissing.delete(id);
    done.set(id, Date.now());
  };
  for (const rec of due.slice(0, MAX_PER_RUN)) {
    const id = String(rec.key.id);
    const rj = String(rec.key.remoteJid ?? '');
    const alt = String(rec.key.remoteJidAlt ?? '');
    const phoneJid = rj.endsWith('@lid') ? (alt.endsWith('@s.whatsapp.net') ? alt : lids.get(rj)) : undefined;
    // Stored as-is it would create a contact named after the LID number.
    if (rj.endsWith('@lid') && !phoneJid) { finish(id, 'lid_unmapped'); continue; }

    const body = asWebhookBody(instance, rec, phoneJid);
    const fromMe = rec.key.fromMe === true;
    const parsed = fromMe ? parseOutboundEcho(body) : parseInbound(body);
    // Reactions, protocol stubs, undecryptable messages: nothing the live
    // pipeline would store either.
    if (!parsed) { finish(id, 'unhandled'); continue; }

    try {
      const conversationId = await conversationRepository.findActiveConversationByAddress('whatsapp', parsed.externalContactId, instance);
      if (opts.dryRun) {
        finish(id, conversationId ? (fromMe ? 'would_store_out' : 'would_store_in') : 'would_go_live_pipeline');
        continue;
      }
      if (!conversationId) {
        // Handed over once: whatever the live pipeline decides (store, or drop
        // a group echo) is final, and it must not be re-posted every run.
        const payload: InboundWebhookReceivedPayload = { provider: 'evolution', rawBody: body };
        await aiEventBus.publish({ type: ChannelEvents.InboundWebhookReceived, payload: payload as unknown as Record<string, unknown>, timestamp: new Date() });
        finish(id, 'live_pipeline');
        continue;
      }

      let media = parsed.media;
      if (!media && parsed.pendingMedia) {
        const file = await getEvolutionClient().getBase64FromMedia(instance, id);
        if (file?.base64) media = { ...parsed.pendingMedia, mimeType: file.mimetype || parsed.pendingMedia.mimeType, base64: file.base64 };
      }
      const inbound = fromMe ? undefined : (parsed as ReturnType<typeof parseInbound> & {});
      const result = await conversationRepository.insertReconciledMessage({
        conversationId,
        channel: 'whatsapp',
        providerMessageId: id,
        content: parsed.text,
        tsSec: Number(rec.messageTimestamp),
        fromMe,
        media,
        sender: inbound?.isGroup ? { name: inbound.senderName, phone: inbound.senderParticipant } : undefined,
        quotedProviderMessageId: parsed.quotedProviderMessageId,
        quoted: parsed.quoted,
        pix: parsed.pix,
        contacts: parsed.contacts,
      });
      finish(id, result.inserted ? (fromMe ? 'stored_out' : 'stored_in') : 'already_there');
    } catch (error) {
      count('error');
      logger.warn({ instance, id, err: String(error) }, '[reconciler] failed to store message');
    }
  }
  logger.info({ instance, due: due.length, dryRun: !!opts.dryRun, ...tally }, '[reconciler] recovered messages the webhook missed');
  return tally;
}

/**
 * Two symptoms, both seen in production:
 *  - late: what does arrive was stored long after it was sent (median of the
 *    last 30 min of deliveries);
 *  - silent: nothing at all in Evolution's own store for a while, in business
 *    hours, while the number reads `open`.
 */
async function checkHealth(
  instance: string,
  records: Rec[],
  stored: Map<string, { createdAt: string; sentAt: string }>,
  opts: ReconcileOptions,
): Promise<void> {
  const now = Date.now();
  // What this reconciler stored itself is late by construction — not a symptom.
  const delays = [...stored.entries()]
    .filter(([id, s]) => !done.has(id) && now - Date.parse(s.createdAt) <= 30 * MIN)
    .map(([, s]) => s)
    .map((s) => (Date.parse(s.createdAt) - Date.parse(s.sentAt)) / MIN)
    .sort((a, b) => a - b);
  const median = delays.length ? delays[Math.floor(delays.length / 2)] : 0;
  const newestSec = records.reduce((max, r) => Math.max(max, Number(r.messageTimestamp) || 0), 0);
  const silentMin = newestSec ? (now / 1000 - newestSec) / 60 : Infinity;

  let body: string | undefined;
  if (delays.length >= 3 && median >= LAG_ALERT_MIN()) {
    body = `As mensagens estão chegando com cerca de ${Math.round(median)} min de atraso. O que chegar atrasado é recuperado sozinho; se não normalizar, reconecte o número pelo QR.`;
  } else if (businessHours() && silentMin >= SILENCE_ALERT_MIN()) {
    const since = Number.isFinite(silentMin) ? `há ${Math.round(silentMin / 60 * 10) / 10} h` : 'há muito tempo';
    body = `Nenhuma mensagem recebida nem enviada ${since}, mas o número aparece conectado. Confira no celular se há conversas novas; se houver, reconecte o número pelo QR.`;
  }
  if (!body) return;
  if (opts.dryRun) {
    logger.warn({ instance, median, silentMin, body }, '[reconciler] would raise delivery alert (dry run)');
    return;
  }

  const title = `WhatsApp "${instance}" com problema`;
  if (await conversationRepository.hasRecentNotification(ALERT_TYPE, title, ALERT_REPEAT_MS)) return;
  const users = await conversationRepository.managerUserIds();
  await conversationRepository.notifyUsers(users, { type: ALERT_TYPE, title, body, link: '/settings/conexoes' });
  logger.warn({ instance, median, silentMin, users: users.length }, '[reconciler] delivery alert raised');
}

export async function reconcileAll(opts: ReconcileOptions = {}): Promise<Record<string, Record<string, number>>> {
  const report: Record<string, Record<string, number>> = {};
  if (running) return report;
  running = true;
  try {
    const instances = await getEvolutionClient().fetchInstances();
    for (const inst of instances) {
      const name = inst.name ?? inst.instance?.instanceName;
      const status = inst.connectionStatus ?? inst.instance?.status;
      if (!name || (opts.instance && opts.instance !== name)) continue;
      // A number named explicitly is read even when closed or moved to WAHA:
      // its Evolution store still holds what was never delivered.
      const named = opts.instance === name;
      if (status !== 'open' && !named) continue;
      // Moved to WAHA: its Evolution twin is stale, and its silence is expected.
      if (!named && (await wahaDirectory.isOnWaha(name))) continue;
      try {
        report[name] = await reconcileInstance(name, opts);
      } catch (error) {
        logger.warn({ instance: name, err: String(error) }, '[reconciler] instance run failed');
      }
    }
    // Ids that left the window are never coming back to this check.
    const cutoff = Date.now() - 2 * lookbackSec() * 1000;
    for (const [id, at] of firstMissing) if (at < cutoff) firstMissing.delete(id);
    for (const [id, at] of done) if (at < cutoff) done.delete(id);
  } catch (error) {
    logger.warn({ err: String(error) }, '[reconciler] run failed');
  } finally {
    running = false;
  }
  return report;
}

/** Started once at boot. RECONCILE_ENABLED=false turns it off. */
export function startEvolutionReconciler(): void {
  if ((configService.get('RECONCILE_ENABLED') ?? '').toLowerCase() === 'false') return;
  setTimeout(() => { void reconcileAll(); }, 2 * MIN).unref?.();
  setInterval(() => { void reconcileAll(); }, interval()).unref?.();
}
