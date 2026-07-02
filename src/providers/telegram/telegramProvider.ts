import type { ChannelAccountStatus, ChannelCapabilities, ChannelType } from '@/types';
import { BaseChannelProvider } from '../base/BaseChannelProvider';
import { defaultBusinessHours } from '../base/defaults';

class TelegramProvider extends BaseChannelProvider {
  readonly channel: ChannelType = 'telegram';
  readonly capabilities: ChannelCapabilities = {
    attachments: true,
    typing: true,
    reactions: true,
    readReceipts: false,
    voice: true,
    video: true,
  };

  protected defaultStatus(): ChannelAccountStatus {
    return {
      channel: 'telegram',
      connected: false,
      accountName: undefined,
      lastSyncAt: null,
      aiEnabled: false,
      defaultAgentId: null,
      greetingMessage: 'Olá! Este é o canal de atendimento via Telegram.',
      autoTags: ['telegram'],
      slaMinutes: 20,
      businessHours: defaultBusinessHours(),
      autoResponses: {
        welcome: 'Mensagem recebida! Em breve um atendente responderá por aqui.',
      },
    };
  }
}

export function createTelegramProvider() {
  return new TelegramProvider();
}
