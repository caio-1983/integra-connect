import { configService } from '../config/ConfigService.js';
import { logger } from '../logger/Logger.js';
import { conversationRepository } from '../persistence/ConversationRepository.js';
import { evolutionConnectionService, type GroupInfoResult } from './evolution/EvolutionConnectionService.js';
import type { ConnectionStateResult, InstanceSummary, QrResult } from './evolution/types.js';
import { wahaConnectionService } from './waha/WahaConnectionService.js';
import { wahaConfigured, wahaDirectory } from './waha/wahaRuntime.js';

/**
 * One door for the WhatsApp numbers screen while two servers coexist.
 *
 * Each call goes to the server the number lives on (WAHA when it has a session
 * there, else Evolution). New numbers — and any number created again under the
 * same name, which is how one is MIGRATED — go to WAHA once it is configured,
 * unless WHATSAPP_NEW_NUMBERS_ON=evolution.
 */
async function onWaha(instance: string): Promise<boolean> {
  return wahaDirectory.isOnWaha(instance);
}

function newNumbersOnWaha(): boolean {
  return wahaConfigured() && configService.get('WHATSAPP_NEW_NUMBERS_ON') !== 'evolution';
}

export const whatsappConnections = {
  /** Both servers' numbers; a number on WAHA hides its old Evolution twin. */
  async listInstances(): Promise<InstanceSummary[]> {
    const [evolution, waha] = await Promise.all([
      evolutionConnectionService.listInstances().catch((error) => {
        // With every number migrated, Evolution being down must not empty the screen.
        if (!wahaConfigured()) throw error;
        logger.warn({ err: String(error) }, '[whatsapp] Evolution list failed — showing WAHA numbers only');
        return [] as InstanceSummary[];
      }),
      wahaConnectionService.listInstances(),
    ]);
    const onWahaNames = new Set(waha.map((i) => i.name));
    return [...waha, ...evolution.filter((i) => !onWahaNames.has(i.name))].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createInstance(instanceName: string): Promise<{ qr: QrResult; major: number; webhookUrl: string }> {
    if (newNumbersOnWaha() || (await onWaha(instanceName))) return wahaConnectionService.createInstance(instanceName);
    return evolutionConnectionService.createInstance(instanceName);
  },

  async getQr(instanceName: string): Promise<QrResult> {
    return (await onWaha(instanceName)) ? wahaConnectionService.getQr(instanceName) : evolutionConnectionService.getQr(instanceName);
  },

  async getState(instanceName: string): Promise<ConnectionStateResult> {
    return (await onWaha(instanceName)) ? wahaConnectionService.getState(instanceName) : evolutionConnectionService.getState(instanceName);
  },

  async disconnect(instanceName: string): Promise<void> {
    return (await onWaha(instanceName)) ? wahaConnectionService.disconnect(instanceName) : evolutionConnectionService.disconnect(instanceName);
  },

  /** Fresh QR. A number still on Evolution moves to WAHA here when new numbers go there. */
  async reconnect(instanceName: string): Promise<QrResult> {
    if (newNumbersOnWaha() || (await onWaha(instanceName))) return wahaConnectionService.reconnect(instanceName);
    return evolutionConnectionService.reconnect(instanceName);
  },

  async remove(instanceName: string): Promise<void> {
    return (await onWaha(instanceName)) ? wahaConnectionService.remove(instanceName) : evolutionConnectionService.remove(instanceName);
  },

  async importContacts(instanceName: string) {
    return (await onWaha(instanceName)) ? wahaConnectionService.importContacts(instanceName) : evolutionConnectionService.importContacts(instanceName);
  },

  async getGroupParticipants(conversationId: string): Promise<GroupInfoResult> {
    const info = await conversationRepository.getConversationChannelInfo(conversationId);
    if (!info) throw new Error('Conversa sem instância associada.');
    if (!info.to.endsWith('@g.us')) throw new Error('Esta conversa não é um grupo.');
    if (await onWaha(info.instance)) return wahaConnectionService.getGroupParticipants(info.instance, info.to);
    return evolutionConnectionService.getGroupParticipants(conversationId);
  },
};
