import type { AgentId, AIModel } from '../types/index.js';

/**
 * Which model each agent uses — hardcoded this sprint. There's no `IA →
 * Modelos` CRUD page yet (Entrega 9, deferred); the frontend never sees or
 * chooses a model anymore (Adjustment 12) — only this backend does.
 */
export const AGENT_MODEL_MAP: Record<AgentId, AIModel> = {
  atendimento: {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    supportsTools: true,
    supportsVision: true,
    supportsEmbeddings: true,
    supportsStreaming: true,
    contextWindow: 128000,
  },
  recepcao: { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', supportsTools: true, supportsVision: true, supportsEmbeddings: true, supportsStreaming: true, contextWindow: 128000 },
  comercial: { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', supportsTools: true, supportsVision: true, supportsEmbeddings: true, supportsStreaming: true, contextWindow: 128000 },
  financeiro: { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', supportsTools: true, supportsVision: true, supportsEmbeddings: true, supportsStreaming: true, contextWindow: 128000 },
  suporte: { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', supportsTools: true, supportsVision: true, supportsEmbeddings: true, supportsStreaming: true, contextWindow: 128000 },
};

export function resolveModelForAgent(agentId: AgentId): AIModel {
  return AGENT_MODEL_MAP[agentId];
}
