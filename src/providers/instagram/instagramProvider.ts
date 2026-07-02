import type { ChannelAccountStatus, ChannelCapabilities, ChannelType } from '@/types';
import { BaseChannelProvider } from '../base/BaseChannelProvider';
import { defaultBusinessHours } from '../base/defaults';

class InstagramProvider extends BaseChannelProvider {
  readonly channel: ChannelType = 'instagram';
  readonly capabilities: ChannelCapabilities = {
    attachments: true,
    typing: true,
    reactions: true,
    readReceipts: true,
    voice: false,
    video: false,
  };

  protected defaultStatus(): ChannelAccountStatus {
    return {
      channel: 'instagram',
      connected: false,
      accountName: undefined,
      lastSyncAt: null,
      aiEnabled: false,
      defaultAgentId: null,
      greetingMessage: 'Oi! Obrigado por chamar no nosso Instagram 💜',
      autoTags: ['instagram'],
      slaMinutes: 30,
      businessHours: defaultBusinessHours(),
      autoResponses: {
        welcome: 'Recebemos sua mensagem por aqui! Já te respondemos.',
      },
    };
  }
}

export function createInstagramProvider() {
  return new InstagramProvider();
}
