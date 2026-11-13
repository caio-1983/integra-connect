import { configService } from '../../config/ConfigService.js';
import { conversationRepository, type BulkImportContactsResult } from '../../persistence/ConversationRepository.js';
import type { ConnectionStateResult, InstanceSummary, QrResult } from '../evolution/types.js';
import type { GroupInfoResult, GroupParticipant } from '../evolution/EvolutionConnectionService.js';
import { phoneOf } from './inboundParser.js';
import { sessionNameFor, type WahaSession, type WahaSessionStatus } from './WahaClient.js';
import { getWahaClient, instanceOfSession, wahaDirectory } from './wahaRuntime.js';

/** Events each session posts to us. `message.any` covers both directions; acks give ✓✓. */
const WEBHOOK_EVENTS = ['message.any', 'message.ack', 'session.status'];

function stateOf(status: WahaSessionStatus | undefined): ConnectionStateResult['state'] {
  if (status === 'WORKING') return 'open';
  if (status === 'STARTING' || status === 'SCAN_QR_CODE') return 'connecting';
  if (status === 'STOPPED' || status === 'FAILED') return 'close';
  return 'unknown';
}

export function toWahaSummary(session: WahaSession): InstanceSummary {
  const state = stateOf(session.status);
  const status: InstanceSummary['status'] = state === 'unknown' ? 'close' : state;
  const digits = phoneOf(session.me?.id);
  return {
    name: instanceOfSession(session),
    number: digits ? `+${digits}` : undefined,
    status,
    connected: status === 'open',
    profileName: session.me?.pushName || undefined,
  };
}

async function requireSession(instance: string): Promise<WahaSession> {
  const session = await wahaDirectory.sessionFor(instance);
  if (!session) throw new Error(`O número ${instance} não está na WAHA.`);
  return session;
}

/** Waits (up to ~20 s) for the session to ask for a scan, then returns its QR. */
async function qrWhenReady(session: string): Promise<QrResult> {
  const client = getWahaClient();
  for (let i = 0; i < 20; i++) {
    const info = await client.getSession(session);
    if (info?.status === 'WORKING') return {};
    if (info?.status === 'SCAN_QR_CODE') {
      const base64 = await client.getQrDataUrl(session);
      if (base64) return { base64 };
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return {};
}

/**
 * Number lifecycle on WAHA, with the same contract as
 * EvolutionConnectionService so the routes and the connect sheet do not change.
 */
export const wahaConnectionService = {
  /** Where WAHA posts events. WAHA_WEBHOOK_BASE_URL lets it reach the backend
   *  over the Docker network (http://ai-runtime:8787) instead of the internet. */
  webhookUrl(): string {
    const base = (configService.get('WAHA_WEBHOOK_BASE_URL') || configService.require('PUBLIC_BASE_URL')).replace(/\/$/, '');
    return `${base}/webhooks/waha/${configService.require('WAHA_WEBHOOK_SECRET')}`;
  },

  maskedWebhookUrl(): string {
    const base = (configService.get('WAHA_WEBHOOK_BASE_URL') || configService.require('PUBLIC_BASE_URL')).replace(/\/$/, '');
    return `${base}/webhooks/waha/{WAHA_WEBHOOK_SECRET}`;
  },

  /** Session for the instance (existing or new), pointed at our webhook. */
  async ensureSession(instanceName: string): Promise<string> {
    const existing = await wahaDirectory.sessionFor(instanceName);
    const session = existing?.name ?? sessionNameFor(instanceName);
    await getWahaClient().upsertSession(session, instanceName, {
      url: this.webhookUrl(),
      events: WEBHOOK_EVENTS,
      hmacKey: configService.require('WAHA_WEBHOOK_SECRET'),
    });
    wahaDirectory.invalidate();
    return session;
  },

  async createInstance(instanceName: string): Promise<{ qr: QrResult; major: number; webhookUrl: string }> {
    const session = await this.ensureSession(instanceName);
    return { qr: await qrWhenReady(session), major: 0, webhookUrl: this.maskedWebhookUrl() };
  },

  async listInstances(): Promise<InstanceSummary[]> {
    return [...(await wahaDirectory.sessions()).values()].map(toWahaSummary);
  },

  async getState(instanceName: string): Promise<ConnectionStateResult> {
    const session = await requireSession(instanceName);
    const live = await getWahaClient().getSession(session.name);
    return { state: stateOf(live?.status) };
  },

  async getQr(instanceName: string): Promise<QrResult> {
    const session = await requireSession(instanceName);
    const live = await getWahaClient().getSession(session.name);
    if (live?.status === 'STOPPED' || live?.status === 'FAILED') await getWahaClient().restartSession(session.name);
    return qrWhenReady(session.name);
  },

  /** Re-points the webhook and hands out a fresh QR (restarting a stopped/failed session). */
  async reconnect(instanceName: string): Promise<QrResult> {
    const session = await this.ensureSession(instanceName);
    const live = await getWahaClient().getSession(session);
    if (live?.status === 'FAILED') await getWahaClient().restartSession(session);
    return qrWhenReady(session);
  },

  async disconnect(instanceName: string): Promise<void> {
    const session = await requireSession(instanceName);
    await getWahaClient().logoutSession(session.name);
    wahaDirectory.invalidate();
  },

  /** Deletes the session: the number goes back to Evolution routing (if it still exists there). */
  async remove(instanceName: string): Promise<void> {
    const session = await requireSession(instanceName);
    await getWahaClient().deleteSession(session.name);
    wahaDirectory.invalidate();
  },

  async importContacts(instanceName: string): Promise<BulkImportContactsResult> {
    const session = await requireSession(instanceName);
    const client = getWahaClient();
    const [contacts, lids] = await Promise.all([client.allContacts(session.name), client.allLids(session.name)]);
    const phoneByLid = new Map(lids.map((l) => [l.lid, l.pn]));
    const rows = contacts
      .map((c) => {
        const id = String(c.id ?? '');
        if (!id || id.endsWith('@g.us')) return null;
        const phone = phoneOf(id) ?? phoneOf(phoneByLid.get(id));
        if (!phone) return null;
        return { phoneNumber: phone, name: c.name || c.pushname || null, profilePictureUrl: null };
      })
      .filter((c): c is { phoneNumber: string; name: string | null; profilePictureUrl: null } => c !== null);
    return conversationRepository.bulkImportContacts(rows);
  },

  async getGroupParticipants(instanceName: string, groupJid: string): Promise<GroupInfoResult> {
    const session = await requireSession(instanceName);
    const client = getWahaClient();
    const [subject, raw] = await Promise.all([client.groupSubject(session.name, groupJid), client.groupParticipants(session.name, groupJid)]);
    const participants = raw
      .map((p) => {
        const phoneNumber = phoneOf(p.pn) ?? phoneOf(p.id);
        return phoneNumber ? { phoneNumber, isAdmin: p.role === 'admin' || p.role === 'superadmin' } : null;
      })
      .filter((p): p is GroupParticipant => p !== null);
    const names = await conversationRepository.getContactNamesByPhone(participants.map((p) => p.phoneNumber));
    for (const p of participants) p.name = names[p.phoneNumber];
    return { subject, participants };
  },
};
