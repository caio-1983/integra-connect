import type { ChannelAccountStatus, ChannelCapabilities, ChannelType } from '@/types';
import { BaseChannelProvider } from '../base/BaseChannelProvider';
import { defaultBusinessHours } from '../base/defaults';

class FacebookProvider extends BaseChannelProvider {
  readonly channel: ChannelType = 'facebook';
  readonly capabilities: ChannelCapabilities = {
    attachments: true,
    typing: true,
    reactions: true,
    readReceipts: true,
    voice: true,
    video: false,
  };

  protected defaultStatus(): ChannelAccountStatus {
    return {
      channel: 'facebook',
      connected: false,
      accountName: undefined,
      lastSyncAt: null,
      aiEnabled: false,
      defaultAgentId: null,
      greetingMessage: 'Olá! Recebemos sua mensagem pelo Messenger.',
      autoTags: ['facebook'],
      slaMinutes: 30,
      businessHours: defaultBusinessHours(),
      autoResponses: {
        welcome: 'Obrigado por entrar em contato pelo Facebook Messenger!',
      },
    };
  }
}

export function createFacebookProvider() {
  return new FacebookProvider();
}
