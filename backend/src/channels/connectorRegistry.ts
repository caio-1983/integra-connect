import type { ChannelConnector } from './ChannelConnector.js';
import { evolutionChannelConnector } from './evolution/EvolutionChannelConnector.js';
import { metaChannelConnector } from './meta/MetaChannelConnector.js';
import { wahaChannelConnector } from './waha/WahaChannelConnector.js';
import { wahaDirectory } from './waha/wahaRuntime.js';

/**
 * provider → connector. `meta` covers both Facebook Messenger and Instagram
 * Direct: they share one Graph API and one page token per account, so the channel
 * is decided per message from the webhook envelope rather than by having two
 * connectors. Telegram/Webchat remain unimplemented.
 *
 * `evolution` and `waha` are two servers for the same thing, WhatsApp on a
 * paired phone — see `connectorFor`.
 */
const REGISTRY: Record<string, ChannelConnector> = {
  evolution: evolutionChannelConnector,
  waha: wahaChannelConnector,
  meta: metaChannelConnector,
};

/** The connector that PARSES a webhook from this provider. */
export function getConnector(provider: string): ChannelConnector | undefined {
  return REGISTRY[provider];
}

const PAIRED_WHATSAPP = new Set(['evolution', 'waha']);

/**
 * The connector that SENDS for a conversation. For paired-phone WhatsApp the
 * server is decided by the number, not by what the conversation row says: a
 * number moved to WAHA keeps its conversations (stored as `evolution`) and
 * their replies must leave through WAHA from then on.
 */
export async function connectorFor(provider: string, instance: string): Promise<ChannelConnector | undefined> {
  if (!PAIRED_WHATSAPP.has(provider)) return REGISTRY[provider];
  return (await wahaDirectory.isOnWaha(instance)) ? wahaChannelConnector : evolutionChannelConnector;
}

/** `provider` to store on a new paired-WhatsApp conversation of this number. */
export async function whatsappProviderFor(instance: string): Promise<'evolution' | 'waha'> {
  return (await wahaDirectory.isOnWaha(instance)) ? 'waha' : 'evolution';
}
