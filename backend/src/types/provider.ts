import type { AIToolSchema } from './tool.js';

/**
 * Provider contract — the single seam a real LLM vendor plugs into. Routes
 * and agents never import a concrete provider; only `ModelGateway` does,
 * via `providers/registry.ts`.
 */
export type AIProviderId = 'local' | 'openai' | 'claude' | 'gemini' | 'ollama' | 'azure';

export interface AIChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface AIToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIChatRequest {
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  tools?: AIToolSchema[];
}

export interface AIChatResponse {
  content: string;
  tokensUsed?: number;
  latencyMs: number;
  toolCalls?: AIToolCallRequest[];
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
