import type {
  AIChatRequest, AIChatResponse, AICompletionRequest, AICompletionResponse,
  AIEmbeddingsRequest, AIEmbeddingsResponse, AIProvider, AIProviderId,
} from '@/ai/types';

/**
 * Base class every AI provider extends — mirrors `BaseChannelProvider`'s
 * role for channels. The whole app depends on the `AIProvider` contract
 * (this class), never on a concrete provider. Unimplemented providers simply
 * inherit these throwing defaults until a real integration is added.
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: AIProviderId;

  async chat(_req: AIChatRequest): Promise<AIChatResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado nesta sprint.`);
  }

  async embeddings(_req: AIEmbeddingsRequest): Promise<AIEmbeddingsResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado nesta sprint.`);
  }

  async completion(_req: AICompletionRequest): Promise<AICompletionResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado nesta sprint.`);
  }
}
