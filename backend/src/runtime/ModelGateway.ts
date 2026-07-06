import type { AgentId, AIChatRequest, AIChatResponse, AIModel, AIProvider } from '../types/index.js';
import { resolveModelForAgent } from '../models/agentModelMap.js';
import { getAIProvider } from '../providers/registry.js';

/** The only place that turns an `AgentId` into a real `AIProvider` call. Routes and pipeline steps never import a provider directly. */
export function resolveProviderForAgent(agentId: AgentId): { model: AIModel; provider: AIProvider } {
  const model = resolveModelForAgent(agentId);
  return { model, provider: getAIProvider(model.provider) };
}

export async function callModel(agentId: AgentId, request: Omit<AIChatRequest, 'model'>): Promise<AIChatResponse> {
  const { model, provider } = resolveProviderForAgent(agentId);
  return provider.chat({ ...request, model: model.id });
}
