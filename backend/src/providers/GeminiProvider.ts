import type { AIProviderId } from '../types/index.js';
import { BaseAIProvider } from './BaseAIProvider.js';

/** Prepared structure only — no Gemini API call is made this sprint. */
class GeminiProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'gemini';
}

export function createGeminiProvider(): GeminiProvider {
  return new GeminiProvider();
}
