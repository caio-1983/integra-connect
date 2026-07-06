import type { AIProvider, AIProviderId } from '@/ai/types';
import { AI_PROVIDER_REGISTRY } from '@/ai/providers/registry';

const instances = new Map<AIProviderId, AIProvider>();

export function getAIProvider(id: AIProviderId = 'local'): AIProvider {
  const factory = AI_PROVIDER_REGISTRY[id];
  if (!factory) {
    console.warn(`[ai] Provider "${id}" não registrado — usando "local".`);
    return getAIProvider('local');
  }
  let instance = instances.get(id);
  if (!instance) {
    instance = factory();
    instances.set(id, instance);
  }
  return instance;
}

export function getAllAIProviderIds(): AIProviderId[] {
  return Object.keys(AI_PROVIDER_REGISTRY) as AIProviderId[];
}
