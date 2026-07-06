import type { AIProviderId } from '../types/index.js';
import { BaseAIProvider } from './BaseAIProvider.js';

/** Prepared structure only — no Ollama call is made this sprint. */
class OllamaProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'ollama';
}

export function createOllamaProvider(): OllamaProvider {
  return new OllamaProvider();
}
