import type { AIProviderId } from '@/ai/types';
import { BaseAIProvider } from './BaseAIProvider';

/** Prepared structure only — no Anthropic API call is made this sprint. */
class ClaudeProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'claude';
}

export function createClaudeProvider(): ClaudeProvider {
  return new ClaudeProvider();
}
