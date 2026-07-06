import type { AIProviderId } from '@/ai/types';
import { BaseAIProvider } from './BaseAIProvider';

/** Prepared structure only — no Google Gemini API call is made this sprint. */
class GeminiProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'gemini';
}

export function createGeminiProvider(): GeminiProvider {
  return new GeminiProvider();
}
