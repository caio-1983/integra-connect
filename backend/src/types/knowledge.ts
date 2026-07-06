import type { AgentId } from './agent.js';

/** Prepared for future RAG — no vector search implemented this sprint. */
export type KnowledgeSourceType = 'faq' | 'pdf' | 'website' | 'manual' | 'crm' | 'api' | 'database';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  agentIds: AgentId[];
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;
  score: number;
}

/**
 * A pluggable origin of knowledge (FAQ, PDF, website, CRM, ...). The
 * KnowledgeEngine orchestrates one or more sources; a new source type later
 * is a new class implementing this interface plus one line in the engine's
 * `sources` array — no agent or step changes.
 */
export interface KnowledgeSource {
  readonly id: string;
  readonly name: string;
  readonly type: KnowledgeSourceType;
  search(query: string): KnowledgeSearchResult[];
}
