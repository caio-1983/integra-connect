import type { ChannelAccountStatus, ChannelCapabilities, ChannelType } from '@/types';
import { BaseChannelProvider } from '../base/BaseChannelProvider';
import { defaultBusinessHours } from '../base/defaults';

class WhatsAppProvider extends BaseChannelProvider {
  readonly channel: ChannelType = 'whatsapp';
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
      channel: 'whatsapp',
      connected: true,
      accountName: '+55 11 98432-1567',
      lastSyncAt: new Date().toISOString(),
      aiEnabled: true,
      defaultAgentId: null,
      greetingMessage: 'Olá! Bem-vindo(a) ao atendimento via WhatsApp. Em que posso ajudar?',
      autoTags: ['whatsapp'],
      slaMinutes: 15,
      businessHours: defaultBusinessHours(),
      autoResponses: {
        welcome: 'Olá! Recebemos sua mensagem e já vamos te atender.',
        afterHours: 'Nosso atendimento no WhatsApp funciona de seg. a sex., das 8h às 18h. Retornaremos assim que possível.',
      },
    };
  }
}

export function createWhatsAppProvider() {
  return new WhatsAppProvider();
}
