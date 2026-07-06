import type { AgentId, KnowledgeArticle, KnowledgeSearchResult, KnowledgeSource } from '../types/index.js';
import { faqKnowledgeSource } from './FAQKnowledgeSource.js';
import { MOCK_KNOWLEDGE_ARTICLES } from './mockKnowledgeData.js';

/**
 * Orchestrates one or more `KnowledgeSource`s (FAQ, PDF, website, CRM, API,
 * database...). Agents/steps never consult a source directly — always
 * through this engine. Adding a new source later is a new class + one line
 * in `sources` below.
 */
class KnowledgeEngine {
  readonly sources: KnowledgeSource[] = [faqKnowledgeSource];

  listArticles(agentId?: AgentId): KnowledgeArticle[] {
    if (!agentId) return MOCK_KNOWLEDGE_ARTICLES;
    return MOCK_KNOWLEDGE_ARTICLES.filter((a) => a.agentIds.includes(agentId));
  }

  search(query: string, agentId?: AgentId): KnowledgeSearchResult[] {
    const results = this.sources.flatMap((source) => source.search(query));
    const filtered = agentId ? results.filter((r) => r.article.agentIds.includes(agentId)) : results;
    return filtered.sort((a, b) => b.score - a.score);
  }
}

export const knowledgeEngine = new KnowledgeEngine();
