/**
 * AI Provider contract — the single seam a real LLM integration replaces.
 *
 * Every agent talks exclusively to `AIProvider` (via `BaseAIProvider` and the
 * model gateway), never to a concrete provider class. Adding a real provider
 * later means: implement this interface, register a factory in
 * `src/ai/providers/registry.ts`, done — no agent/service above this layer
 * needs to change.
 */
export type AIProviderId = 'local' | 'openai' | 'claude' | 'gemini' | 'ollama' | 'azure';

export interface AIChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  modelId?: string;
  temperature?: number;
}

export interface AIChatResponse {
  content: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface AIEmbeddingsRequest {
  input: string;
}

export interface AIEmbeddingsResponse {
  vector: number[];
  dimensions: number;
}

export interface AICompletionRequest {
  prompt: string;
  maxTokens?: number;
}

export interface AICompletionResponse {
  text: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  chat(req: AIChatRequest): Promise<AIChatResponse>;
  embeddings(req: AIEmbeddingsRequest): Promise<AIEmbeddingsResponse>;
  completion(req: AICompletionRequest): Promise<AICompletionResponse>;
}
