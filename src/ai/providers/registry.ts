import type { AIProvider, AIProviderId } from '@/ai/types';
import { createLocalAIProvider } from './LocalAIProvider';
import { createOpenAIProvider } from './OpenAIProvider';
import { createClaudeProvider } from './ClaudeProvider';
import { createGeminiProvider } from './GeminiProvider';
import { createOllamaProvider } from './OllamaProvider';

/**
 * Adding a real provider later: implement `AIProvider` (extend
 * `BaseAIProvider`), add one line here. `azure` stays unregistered — a
 * future addition — and `ai-provider-factory.ts` falls back to `local` for
 * any id without a registered factory.
 */
export const AI_PROVIDER_REGISTRY: Partial<Record<AIProviderId, () => AIProvider>> = {
  local: createLocalAIProvider,
  openai: createOpenAIProvider,
  claude: createClaudeProvider,
  gemini: createGeminiProvider,
  ollama: createOllamaProvider,
};
