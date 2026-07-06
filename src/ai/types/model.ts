import type { AIProviderId } from './provider';

/**
 * A model is what an agent is configured to use; a provider is what actually
 * executes it. Agents reference a `modelId`, never a provider directly — see
 * `src/ai/services/modelGateway.ts` for the `modelId -> AIModel -> AIProvider`
 * resolution. Swapping an agent's model is a one-field `AgentConfig` change.
 */
export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderId;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsEmbeddings: boolean;
  supportsStreaming: boolean;
  contextWindow: number;
}
