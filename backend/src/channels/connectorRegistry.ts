import type { ChannelConnector } from './ChannelConnector.js';
import { evolutionChannelConnector } from './evolution/EvolutionChannelConnector.js';

/** provider → connector. Adding Instagram/Telegram/Messenger/Webchat later = one line here. */
const REGISTRY: Record<string, ChannelConnector> = {
  evolution: evolutionChannelConnector,
};

export function getConnector(provider: string): ChannelConnector | undefined {
  return REGISTRY[provider];
}
