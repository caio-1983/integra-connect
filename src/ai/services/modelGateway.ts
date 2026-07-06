import type { AIChatRequest, AIChatResponse, AIModel } from '@/ai/types';
import { MOCK_AI_MODELS } from '@/lib/mockAIData';
import { getAIProvider } from './ai-provider-factory';

/**
 * The only place that turns a `modelId` into an `AIProvider` call. Agents
 * hold a `modelId` (see `AgentConfig`), never a provider reference — they
 * call `chat()` here and this resolves `modelId -> AIModel -> AIProviderId
 * -> AIProvider` via the registries.
 */
export function resolveModel(modelId: string): AIModel {
  return MOCK_AI_MODELS.find((m) => m.id === modelId) ?? MOCK_AI_MODELS[0];
}

export async function chat(modelId: string, request: AIChatRequest): Promise<AIChatResponse> {
  const model = resolveModel(modelId);
  const provider = getAIProvider(model.provider);
  return provider.chat({ ...request, modelId });
}
