import type { ChannelAccountStatus, ChannelCapabilities, ChannelType } from '@/types';
import { BaseChannelProvider } from '../base/BaseChannelProvider';
import { defaultBusinessHours } from '../base/defaults';

class WebchatProvider extends BaseChannelProvider {
  readonly channel: ChannelType = 'webchat';
  readonly capabilities: ChannelCapabilities = {
    attachments: true,
    typing: true,
    reactions: false,
    readReceipts: false,
    voice: false,
    video: false,
  };

  protected defaultStatus(): ChannelAccountStatus {
    return {
      channel: 'webchat',
      // Webchat is the first native channel — connected by default, no
      // external account to authorize.
      connected: true,
      accountName: 'Widget do site',
      lastSyncAt: new Date().toISOString(),
      aiEnabled: true,
      defaultAgentId: null,
      greetingMessage: 'Olá! Como posso ajudar você hoje?',
      autoTags: ['webchat'],
      slaMinutes: 5,
      businessHours: defaultBusinessHours(),
      autoResponses: {
        welcome: 'Olá! Como posso ajudar você hoje?',
        afterHours: 'Estamos fora do horário de atendimento. Deixe sua mensagem que responderemos em breve.',
      },
    };
  }
}

export function createWebchatProvider() {
  return new WebchatProvider();
}
