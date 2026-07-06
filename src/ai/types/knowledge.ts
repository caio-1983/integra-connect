import type { AgentId } from './agent';

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
 * A pluggable origin of knowledge (FAQ, PDF, website, CRM, ...). A provider
 * orchestrates one or more sources; adding a new source type later is a new
 * class implementing this interface plus one line in the provider's
 * `sources` array — no consuming code changes.
 */
export interface KnowledgeSource {
  readonly id: string;
  readonly name: string;
  readonly type: KnowledgeSourceType;
  search(query: string): KnowledgeSearchResult[];
}

export interface KnowledgeProvider {
  readonly sources: KnowledgeSource[];
  listArticles(agentId?: AgentId): KnowledgeArticle[];
  search(query: string, agentId?: AgentId): KnowledgeSearchResult[];
}
