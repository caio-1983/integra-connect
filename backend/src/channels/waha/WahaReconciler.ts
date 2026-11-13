import { configService } from '../../config/ConfigService.js';
import { logger } from '../../logger/Logger.js';
import { aiEventBus } from '../../runtime/EventBus.js';
import { conversationRepository } from '../../persistence/ConversationRepository.js';
import { ChannelEvents, type InboundWebhookReceivedPayload } from '../channelEvents.js';
import type { NormalizedInbound } from '../evolution/types.js';
import { rawMessageId, type WahaSession } from './WahaClient.js';
import { wahaChannelConnector } from './WahaChannelConnector.js';
import { getWahaClient, instanceOfSession, wahaDirectory } from './wahaRuntime.js';

/**
 * Safety net for WhatsApp messages WAHA has but our database does not — the
 * WAHA counterpart of EvolutionReconciler, same rules:
 *  - what WAHA stored but never posted (history synced when a number is paired,
 *    or anything sent while the backend was down past WAHA's webhook retries);
 *  - thread exists → `insertReconciledMessage` (no bump unless newest);
 *  - no thread → re-published as the webhook event, so the live pipeline makes
 *    contact/conversation/lead exactly as it would have;
 *  - missing on two runs 5 min apart before it is stored, so a message still in
 *    flight through the webhook is never raced.
 *
 * WAHA's store is read chat by chat: the most recently active chats (overview,
 * newest first) down to the lookback window, then each chat's messages since.
 */

const MIN = 60_000;
const interval = () => configService.getNumber('RECONCILE_INTERVAL_MS', 10 * MIN);
const lookbackSec = () => configService.getNumber('RECONCILE_LOOKBACK_HOURS', 72) * 3600;
const GRACE_MS = 5 * MIN;
const MAX_PER_RUN = 300;
const CHATS_PAGE = 100;
const MAX_CHAT_PAGES = 20;
const MESSAGES_PER_CHAT = 300;

const firstMissing = new Map<string, number>();
const done = new Map<string, number>();
let running = false;

type Rec = Record<string, any>;

export interface WahaReconcileOptions {
  dryRun?: boolean;
  graceMs?: number;
  instance?: string;
  /** Override of RECONCILE_LOOKBACK_HOURS for a manual run. */
  hours?: number;
}

/** The message as a `message.any` webhook would have carried it. */
function asWebhookBody(session: WahaSession, chatId: string, msg: Rec) {
  const payload = { ...msg };
  // Stored messages may lack the chat on `from`/`to`; the parser reads it from there.
  if (payload.fromMe) payload.to ??= chatId;
  else payload.from ??= chatId;
  return {
    event: 'message.any',
    session: session.name,
    metadata: session.config?.metadata ?? { instance: instanceOfSession(session) },
    payload,
  };
}

function rawIdOf(msg: Rec): string | undefined {
  const id = msg?._data?.Info?.ID ?? (typeof msg?.id === 'string' ? rawMessageId(msg.id) : undefined);
  return typeof id === 'string' && id ? id : undefined;
}

async function recentMessages(session: WahaSession, sinceSec: number): Promise<Array<{ chatId: string; msg: Rec }>> {
  const client = getWahaClient();
  const out: Array<{ chatId: string; msg: Rec }> = [];
  for (let page = 0; page < MAX_CHAT_PAGES; page++) {
    const chats = await client.chatsOverview(session.name, CHATS_PAGE, page * CHATS_PAGE);
    let reachedOld = false;
    for (const chat of chats) {
      const lastTs = Number(chat.lastMessage?.timestamp ?? 0);
      if (lastTs && lastTs < sinceSec) { reachedOld = true; break; }
      if (!chat.id || /@(newsletter|broadcast)$/.test(chat.id)) continue;
      const messages = await client.getMessages(session.name, chat.id, { limit: MESSAGES_PER_CHAT, sinceSec });
      for (const msg of messages) out.push({ chatId: chat.id, msg });
    }
    if (reachedOld || chats.length < CHATS_PAGE) break;
  }
  return out;
}

async function reconcileSession(session: WahaSession, opts: WahaReconcileOptions): Promise<Record<string, number>> {
  const instance = instanceOfSession(session);
  const sinceSec = Math.floor(Date.now() / 1000) - (opts.hours ? opts.hours * 3600 : lookbackSec());
  const items = await recentMessages(session, sinceSec);

  const byId = new Map<string, { chatId: string; msg: Rec }>();
  for (const item of items) {
    const id = rawIdOf(item.msg);
    if (id && !byId.has(id)) byId.set(id, item);
  }
  const stored = await conversationRepository.storedProviderMessages([...byId.keys()]);

  const now = Date.now();
  const grace = opts.graceMs ?? GRACE_MS;
  const due: Array<{ id: string; chatId: string; msg: Rec }> = [];
  for (const [id, item] of byId) {
    if (stored.has(id) || done.has(id)) { firstMissing.delete(id); continue; }
    if (grace === 0) { due.push({ id, ...item }); continue; }
    const first = firstMissing.get(id);
    if (first === undefined) { firstMissing.set(id, now); continue; }
    if (now - first >= grace) due.push({ id, ...item });
  }
  const tally: Record<string, number> = { scanned: byId.size, missing: due.length };
  if (due.length === 0) return tally;
  due.sort((a, b) => Number(a.msg.timestamp) - Number(b.msg.timestamp));

  const count = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
  const finish = (id: string, outcome: string) => {
    count(outcome);
    if (opts.dryRun) return;
    firstMissing.delete(id);
    done.set(id, Date.now());
  };

  for (const { id, chatId, msg } of due.slice(0, MAX_PER_RUN)) {
    try {
      // The list does not download media; fetch the one message with it.
      let full = msg;
      if (msg.hasMedia && !msg.media?.url && !opts.dryRun) {
        full = (await getWahaClient().getMessage(session.name, chatId, String(msg.id))) ?? msg;
      }
      const body = asWebhookBody(session, chatId, full);
      const parsed = await wahaChannelConnector.parseEvent(body);
      if (!parsed || parsed.kind === 'status') { finish(id, 'unhandled'); continue; }
      const fromMe = parsed.kind === 'echo';
      const data = parsed.data;

      const conversationId = await conversationRepository.findActiveConversationByAddress('whatsapp', data.externalContactId, instance);
      if (opts.dryRun) {
        finish(id, conversationId ? (fromMe ? 'would_store_out' : 'would_store_in') : 'would_go_live_pipeline');
        continue;
      }
      if (!conversationId) {
        const payload: InboundWebhookReceivedPayload = { provider: 'waha', rawBody: body };
        await aiEventBus.publish({ type: ChannelEvents.InboundWebhookReceived, payload: payload as unknown as Record<string, unknown>, timestamp: new Date() });
        finish(id, 'live_pipeline');
        continue;
      }

      const inbound = fromMe ? undefined : (data as NormalizedInbound);
      const result = await conversationRepository.insertReconciledMessage({
        conversationId,
        channel: 'whatsapp',
        providerMessageId: id,
        content: data.text,
        tsSec: Number(full.timestamp ?? data.tsSec),
        fromMe,
        media: data.media,
        sender: inbound?.isGroup ? { name: inbound.senderName, phone: inbound.senderParticipant } : undefined,
        quotedProviderMessageId: data.quotedProviderMessageId,
        quoted: data.quoted,
        pix: data.pix,
        contacts: data.contacts,
      });
      finish(id, result.inserted ? (fromMe ? 'stored_out' : 'stored_in') : 'already_there');
    } catch (error) {
      count('error');
      logger.warn({ instance, id, err: String(error) }, '[waha-reconciler] failed to store message');
    }
  }
  logger.info({ instance, dryRun: !!opts.dryRun, ...tally }, '[waha-reconciler] recovered messages the webhook missed');
  return tally;
}

export async function reconcileWaha(opts: WahaReconcileOptions = {}): Promise<Record<string, Record<string, number>>> {
  const report: Record<string, Record<string, number>> = {};
  if (running) return report;
  running = true;
  try {
    wahaDirectory.invalidate();
    for (const session of (await wahaDirectory.sessions()).values()) {
      const instance = instanceOfSession(session);
      if (opts.instance && opts.instance !== instance) continue;
      if (session.status !== 'WORKING') continue;
      try {
        report[instance] = await reconcileSession(session, opts);
      } catch (error) {
        logger.warn({ instance, err: String(error) }, '[waha-reconciler] session run failed');
      }
    }
    const cutoff = Date.now() - 2 * lookbackSec() * 1000;
    for (const [id, at] of firstMissing) if (at < cutoff) firstMissing.delete(id);
    for (const [id, at] of done) if (at < cutoff) done.delete(id);
  } catch (error) {
    logger.warn({ err: String(error) }, '[waha-reconciler] run failed');
  } finally {
    running = false;
  }
  return report;
}

/** Started once at boot, alongside the Evolution one. RECONCILE_ENABLED=false turns both off. */
export function startWahaReconciler(): void {
  if ((configService.get('RECONCILE_ENABLED') ?? '').toLowerCase() === 'false') return;
  if (!configService.get('WAHA_API_URL')) return;
  setTimeout(() => { void reconcileWaha(); }, 3 * MIN).unref?.();
  setInterval(() => { void reconcileWaha(); }, interval()).unref?.();
}
