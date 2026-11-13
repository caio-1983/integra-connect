import { configService } from '../../config/ConfigService.js';
import { logger } from '../../logger/Logger.js';
import { WahaClient, type WahaSession } from './WahaClient.js';

let client: WahaClient | undefined;

/** True when this deployment talks to a WAHA server at all. */
export function wahaConfigured(): boolean {
  return Boolean(configService.get('WAHA_API_URL') && configService.get('WAHA_API_KEY'));
}

export function getWahaClient(): WahaClient {
  if (!client) client = new WahaClient(configService.require('WAHA_API_URL'), configService.require('WAHA_API_KEY'));
  return client;
}

/** Instance name a session stands for: its `metadata.instance`, else the session name. */
export function instanceOfSession(session: WahaSession): string {
  const named = session.config?.metadata?.instance;
  return typeof named === 'string' && named.trim() ? named : session.name;
}

const TTL_MS = 30_000;
let byInstance = new Map<string, WahaSession>();
let fetchedAt = 0;
let inflight: Promise<void> | undefined;

async function refresh(): Promise<void> {
  try {
    const sessions = await getWahaClient().listSessions();
    byInstance = new Map(sessions.map((s) => [instanceOfSession(s), s]));
    fetchedAt = Date.now();
  } catch (error) {
    // Keep the last known map: dropping it would send a migrated number's
    // replies back through Evolution, where it is no longer paired.
    logger.warn({ err: String(error) }, '[waha] session list failed — keeping the last known one');
    fetchedAt = Date.now() - TTL_MS + 5_000;
  }
}

/**
 * Which WhatsApp numbers live on WAHA. A number belongs to WAHA from the moment
 * a session for it exists there (whatever its status), and goes back to
 * Evolution only when that session is deleted — so migrating a number is just
 * pairing it on WAHA under the same instance name, and conversations keep
 * flowing under that name with no data change.
 */
export const wahaDirectory = {
  async sessions(): Promise<Map<string, WahaSession>> {
    if (!wahaConfigured()) return new Map();
    if (Date.now() - fetchedAt > TTL_MS) {
      inflight ??= refresh().finally(() => { inflight = undefined; });
      await inflight;
    }
    return byInstance;
  },

  async sessionFor(instance: string): Promise<WahaSession | undefined> {
    return (await this.sessions()).get(instance);
  },

  async isOnWaha(instance: string): Promise<boolean> {
    return (await this.sessionFor(instance)) !== undefined;
  },

  /** Forget the cache — after creating/deleting a session. */
  invalidate(): void {
    fetchedAt = 0;
  },
};
