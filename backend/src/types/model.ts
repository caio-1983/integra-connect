import type { AIProviderId } from './provider.js';

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
