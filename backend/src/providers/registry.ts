import type { AIProvider, AIProviderId } from '../types/index.js';
import { createOpenAIProvider } from './OpenAIProvider.js';
import { createClaudeProvider } from './ClaudeProvider.js';
import { createGeminiProvider } from './GeminiProvider.js';
import { createOllamaProvider } from './OllamaProvider.js';

/** Adding a real provider later: implement `AIProvider` (extend `BaseAIProvider`), add one line here. `azure` stays unregistered. */
export const AI_PROVIDER_REGISTRY: Partial<Record<AIProviderId, () => AIProvider>> = {
  openai: createOpenAIProvider,
  claude: createClaudeProvider,
  gemini: createGeminiProvider,
  ollama: createOllamaProvider,
};

const instances = new Map<AIProviderId, AIProvider>();

export function getAIProvider(id: AIProviderId): AIProvider {
  const factory = AI_PROVIDER_REGISTRY[id];
  if (!factory) {
    throw new Error(`[ai] Provider "${id}" não está registrado.`);
  }
  let instance = instances.get(id);
  if (!instance) {
    instance = factory();
    instances.set(id, instance);
  }
  return instance;
}
