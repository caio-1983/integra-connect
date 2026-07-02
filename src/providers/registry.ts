import type { ChannelProvider, ChannelType } from '@/types';
import { createWhatsAppProvider } from './whatsapp/whatsappProvider';
import { createInstagramProvider } from './instagram/instagramProvider';
import { createFacebookProvider } from './facebook/facebookProvider';
import { createTelegramProvider } from './telegram/telegramProvider';
import { createWebchatProvider } from './webchat/webchatProvider';

/**
 * Provider registry — the only place channel implementations are wired up.
 * Adding a channel (email, SMS, Teams, Discord, ...) requires only:
 *   1. extending ChannelType (src/types/channel.ts)
 *   2. creating one provider class extending BaseChannelProvider
 *   3. adding one line here
 *   4. adding one entry to CHANNEL_CONFIG (src/lib/channelConfig.ts)
 * No switch/if-chain on channel, and no other file in the app needs to change.
 */
export const PROVIDER_REGISTRY: Record<ChannelType, () => ChannelProvider> = {
  whatsapp: createWhatsAppProvider,
  instagram: createInstagramProvider,
  facebook: createFacebookProvider,
  telegram: createTelegramProvider,
  webchat: createWebchatProvider,
};
