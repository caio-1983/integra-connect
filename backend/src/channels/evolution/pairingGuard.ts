import { getEvolutionClient } from './evolutionClientInstance.js';
import { toInstanceSummary } from './instanceSummary.js';
import { accessRepository } from '../../persistence/AccessRepository.js';
import { logger } from '../../logger/Logger.js';

/**
 * Keeps an agent's re-pairing on the same phone number.
 *
 * The responsible agent of a number may ask for its QR
 * (whatsapp_instance_responsibles), but whoever scans it decides which WhatsApp
 * the instance becomes. So, from the moment a QR is requested until the number
 * connects (or WATCH_MS passes), the instance is watched: if an agent's pairing
 * comes up as another number, it is logged out on the spot. Admins and managers
 * may switch the number; theirs becomes the number on record.
 *
 * Checked both from the state route the connect sheet polls (instant feedback)
 * and from a timer, so closing the sheet mid-scan does not skip the check.
 * In-memory: a backend restart forgets open watches, which only matters for a
 * scan in those minutes.
 */

const WATCH_MS = 10 * 60_000;
const TICK_MS = 5_000;

interface Watch {
  /** Digits the pairing must come up as; null accepts any (number never known). */
  expected: string | null;
  /** False for admins/managers: any number goes and becomes the record. */
  enforce: boolean;
  until: number;
}

const watches = new Map<string, Watch>();
const rejections = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();
let timer: ReturnType<typeof setInterval> | undefined;

export function phoneDigits(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length > 0 ? digits : null;
}

/** 'reject' when an enforced pairing came up as a number other than the one on record. */
export function pairingVerdict(watch: Pick<Watch, 'expected' | 'enforce'>, connected: string): 'accept' | 'reject' {
  return watch.enforce && watch.expected !== null && watch.expected !== connected ? 'reject' : 'accept';
}

async function connectedNumber(instanceName: string): Promise<{ connected: boolean; number: string | null }> {
  const raw = await getEvolutionClient().fetchInstances();
  const summary = raw.map(toInstanceSummary).find((instance) => instance.name === instanceName);
  return { connected: summary?.connected ?? false, number: phoneDigits(summary?.number) };
}

async function settle(instanceName: string): Promise<void> {
  const watch = watches.get(instanceName);
  if (!watch) return;
  if (Date.now() > watch.until) {
    watches.delete(instanceName);
    return;
  }

  const { connected, number } = await connectedNumber(instanceName);
  // Still waiting for the scan, or Evolution has not reported the owner yet.
  if (!connected || !number) return;
  watches.delete(instanceName);

  if (pairingVerdict(watch, number) === 'reject') {
    rejections.set(instanceName, Date.now());
    logger.warn({ instanceName, expected: watch.expected, connected: number }, '[pairing] agent paired another number — logging it out');
    await getEvolutionClient().logout(instanceName).catch((error) => {
      logger.error({ err: String(error), instanceName }, '[pairing] logout of the wrong number failed');
    });
    return;
  }
  await accessRepository.pinInstanceNumber(instanceName, number);
}

function ensureTimer(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (watches.size === 0) {
      clearInterval(timer);
      timer = undefined;
      return;
    }
    for (const instanceName of watches.keys()) {
      pairingGuard.check(instanceName).catch((error) => {
        logger.warn({ err: String(error), instanceName }, '[pairing] check failed');
      });
    }
  }, TICK_MS);
  timer.unref?.();
}

export const pairingGuard = {
  /**
   * Starts (or, with `fresh: false`, keeps alive) the watch for a QR just
   * handed out. The expected number is the one on record, else the one
   * Evolution still reports for the instance — pinned right away, so a
   * rejected scan cannot become the reference for the next try.
   */
  async watch(instanceName: string, enforce: boolean, { fresh }: { fresh: boolean }): Promise<void> {
    const current = watches.get(instanceName);
    if (current && !fresh && current.enforce === enforce) {
      current.until = Date.now() + WATCH_MS;
      return;
    }

    let expected: string | null = null;
    if (enforce) {
      const responsible = await accessRepository.getInstanceResponsible(instanceName);
      expected = phoneDigits(responsible?.phoneNumber);
      if (!expected) {
        expected = (await connectedNumber(instanceName)).number;
        if (expected) await accessRepository.pinInstanceNumber(instanceName, expected);
      }
    }
    watches.set(instanceName, { expected, enforce, until: Date.now() + WATCH_MS });
    rejections.delete(instanceName);
    ensureTimer();
  },

  /** Settles the watch if the number has connected. Concurrent calls share one run. */
  check(instanceName: string): Promise<void> {
    const running = inflight.get(instanceName);
    if (running) return running;
    const run = settle(instanceName).finally(() => inflight.delete(instanceName));
    inflight.set(instanceName, run);
    return run;
  },

  /** True when the last watched pairing of this number was refused (until a new QR is requested). */
  wasRejected(instanceName: string): boolean {
    const at = rejections.get(instanceName);
    if (at === undefined) return false;
    if (Date.now() - at > WATCH_MS) {
      rejections.delete(instanceName);
      return false;
    }
    return true;
  },
};
