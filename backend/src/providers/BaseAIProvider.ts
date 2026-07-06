import type {
  AIChatRequest, AIChatResponse, AICompletionRequest, AICompletionResponse,
  AIEmbeddingsRequest, AIEmbeddingsResponse, AIProvider, AIProviderId,
} from '../types/index.js';

/** Base class every AI provider extends. `ModelGateway` depends only on this contract, never a concrete class. */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly id: AIProviderId;

  async chat(_req: AIChatRequest): Promise<AIChatResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado.`);
  }

  async embeddings(_req: AIEmbeddingsRequest): Promise<AIEmbeddingsResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado.`);
  }

  async completion(_req: AICompletionRequest): Promise<AICompletionResponse> {
    throw new Error(`[ai] Provider "${this.id}" ainda não implementado.`);
  }
}
