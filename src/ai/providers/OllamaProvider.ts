import type { AIProviderId } from '@/ai/types';
import { BaseAIProvider } from './BaseAIProvider';

/** Prepared structure only — no local Ollama runtime call is made this sprint. */
class OllamaProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'ollama';
}

export function createOllamaProvider(): OllamaProvider {
  return new OllamaProvider();
}
