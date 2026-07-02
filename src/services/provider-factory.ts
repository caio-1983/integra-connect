import type { ChannelProvider, ChannelType } from '@/types';
import { PROVIDER_REGISTRY } from '@/providers/registry';

const instances = new Map<ChannelType, ChannelProvider>();

/**
 * Returns the (memoized) provider instance for a channel. Looked up purely
 * from PROVIDER_REGISTRY — no switch/if-chain on channel here or anywhere
 * else in the app.
 */
export function createChannelProvider(channel: ChannelType): ChannelProvider {
  let instance = instances.get(channel);
  if (!instance) {
    instance = PROVIDER_REGISTRY[channel]();
    instances.set(channel, instance);
  }
  return instance;
}

export function getAllChannelProviders(): ChannelProvider[] {
  return (Object.keys(PROVIDER_REGISTRY) as ChannelType[]).map(createChannelProvider);
}
