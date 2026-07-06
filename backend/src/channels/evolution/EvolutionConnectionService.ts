import type { ConnectionStateResult, InstanceSummary, QrResult } from './types.js';
import { getEvolutionClient } from './evolutionClientInstance.js';
import { configService } from '../../config/ConfigService.js';
import { toInstanceSummary } from './instanceSummary.js';
import { conversationRepository, type BulkImportContactsResult } from '../../persistence/ConversationRepository.js';

const WEBHOOK_EVENTS = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'];

/** Instance lifecycle used by the admin route (Fase 2): create + auto-register webhook, fetch QR, poll state. */
export const evolutionConnectionService = {
  webhookUrl(): string {
    const base = configService.require('PUBLIC_BASE_URL').replace(/\/$/, '');
    const secret = configService.require('EVOLUTION_WEBHOOK_SECRET');
    return `${base}/webhooks/evolution/${secret}`;
  },

  async createInstance(instanceName: string): Promise<{ qr: QrResult; major: number; webhookUrl: string }> {
    const webhookUrl = this.webhookUrl();
    const { qr, major } = await getEvolutionClient().createInstance({ instanceName, webhookUrl, events: WEBHOOK_EVENTS });
    return { qr, major, webhookUrl };
  },

  async getQr(instanceName: string): Promise<QrResult> {
    return getEvolutionClient().connect(instanceName);
  },

  async getState(instanceName: string): Promise<ConnectionStateResult> {
    return getEvolutionClient().connectionState(instanceName);
  },

  async listInstances(): Promise<InstanceSummary[]> {
    const raw = await getEvolutionClient().fetchInstances();
    return raw.map(toInstanceSummary);
  },

  async disconnect(instanceName: string): Promise<void> {
    await getEvolutionClient().logout(instanceName);
  },

  async remove(instanceName: string): Promise<void> {
    await getEvolutionClient().deleteInstance(instanceName);
  },

  /** Fetches a fresh QR AND re-registers the webhook — so reconnecting an
   * existing instance also picks up a changed PUBLIC_BASE_URL (e.g. a new
   * ngrok tunnel) without needing to delete/recreate the instance. */
  async reconnect(instanceName: string): Promise<QrResult> {
    const client = getEvolutionClient();
    await client.setWebhook(instanceName, this.webhookUrl(), WEBHOOK_EVENTS);
    return client.connect(instanceName);
  },

  /** Imports the WhatsApp address book Baileys has synced for this instance
   * into `contacts` — groups and entries with no JID are skipped (groups
   * surface as conversations organically via inbound messages, not here). */
  async importContacts(instanceName: string): Promise<BulkImportContactsResult> {
    const raw = await getEvolutionClient().fetchContacts(instanceName);
    const contacts = raw
      .filter((c) => c.remoteJid && !c.isGroup && !c.remoteJid.endsWith('@g.us'))
      .map((c) => ({
        phoneNumber: c.remoteJid!.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, ''),
        name: c.pushName || null,
        profilePictureUrl: c.profilePicUrl || null,
      }));
    return conversationRepository.bulkImportContacts(contacts);
  },

  /** Resolves the conversation's instance + group JID, fetches the group's
   * current member list from Evolution, and enriches each participant with a
   * name if they're already a known contact (people who never messaged us
   * directly just show as a phone number). */
  async getGroupParticipants(conversationId: string): Promise<GroupInfoResult> {
    const info = await conversationRepository.getConversationChannelInfo(conversationId);
    if (!info) throw new Error('Conversa sem instância associada.');
    if (!info.to.endsWith('@g.us')) throw new Error('Esta conversa não é um grupo.');

    const raw = await getEvolutionClient().fetchGroupInfo(info.instance, info.to);
    const participants = (raw.participants ?? [])
      .map((p) => {
        const jid = p.phoneNumber || p.id || '';
        const phoneNumber = jid.replace(/@s\.whatsapp\.net$/, '').replace(/@.*$/, '');
        return phoneNumber ? { phoneNumber, isAdmin: p.admin != null } : null;
      })
      .filter((p): p is GroupParticipant => p !== null);

    const names = await conversationRepository.getContactNamesByPhone(participants.map((p) => p.phoneNumber));
    for (const p of participants) p.name = names[p.phoneNumber];

    return { subject: raw.subject, participants };
  },
};

export interface GroupParticipant { phoneNumber: string; isAdmin: boolean; name?: string; }
export interface GroupInfoResult { subject?: string; participants: GroupParticipant[]; }
