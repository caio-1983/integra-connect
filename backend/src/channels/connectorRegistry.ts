import type { ChannelConnector } from './ChannelConnector.js';
import { evolutionChannelConnector } from './evolution/EvolutionChannelConnector.js';
import { metaChannelConnector } from './meta/MetaChannelConnector.js';

/**
 * provider → connector. `meta` covers both Facebook Messenger and Instagram
 * Direct: they share one Graph API and one page token per account, so the channel
 * is decided per message from the webhook envelope rather than by having two
 * connectors. Telegram/Webchat remain unimplemented.
 */
const REGISTRY: Record<string, ChannelConnector> = {
  evolution: evolutionChannelConnector,
  meta: metaChannelConnector,
};

export function getConnector(provider: string): ChannelConnector | undefined {
  return REGISTRY[provider];
}
