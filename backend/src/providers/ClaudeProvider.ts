import type { AIProviderId } from '../types/index.js';
import { BaseAIProvider } from './BaseAIProvider.js';

/** Prepared structure only — no Anthropic API call is made this sprint. */
class ClaudeProvider extends BaseAIProvider {
  readonly id: AIProviderId = 'claude';
}

export function createClaudeProvider(): ClaudeProvider {
  return new ClaudeProvider();
}
