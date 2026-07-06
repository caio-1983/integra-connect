import type { AIProviderId } from '@/ai/types';
import { BaseAIProvider } from './BaseAIProvider';

/** Prepared structure only — no OpenAI API call is made this sprint. */
class OpenAIProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'openai';
}

export function createOpenAIProvider(): OpenAIProvider {
  return new OpenAIProvider();
}
