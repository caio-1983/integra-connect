import type { AgentId, KnowledgeArticle, KnowledgeProvider, KnowledgeSearchResult, KnowledgeSource } from '@/ai/types';
import { MOCK_KNOWLEDGE_ARTICLES } from '@/lib/mockAIData';

function scoreArticle(article: KnowledgeArticle, queryWords: string[]): number {
  const haystack = `${article.title} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
  return queryWords.reduce((score, word) => (haystack.includes(word) ? score + 1 : score), 0);
}

/**
 * One concrete knowledge source (wraps the static FAQ seed data). Adding a
 * new source type later (PDF/Website/Manual/CRM/API/Database) is a new class
 * implementing `KnowledgeSource` plus one line in `MockKnowledgeProvider.sources`
 * — no vector search this sprint, just the RAG-prep seam.
 */
class FAQKnowledgeSource implements KnowledgeSource {
  readonly id = 'faq';
  readonly name = 'Perguntas Frequentes';
  readonly type = 'faq' as const;

  search(query: string): KnowledgeSearchResult[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (queryWords.length === 0) return [];

    return MOCK_KNOWLEDGE_ARTICLES
      .map((article) => ({ article, score: scoreArticle(article, queryWords) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }
}

class MockKnowledgeProvider implements KnowledgeProvider {
  readonly sources: KnowledgeSource[] = [new FAQKnowledgeSource()];

  listArticles(agentId?: AgentId): KnowledgeArticle[] {
    if (!agentId) return MOCK_KNOWLEDGE_ARTICLES;
    return MOCK_KNOWLEDGE_ARTICLES.filter((a) => a.agentIds.includes(agentId));
  }

  search(query: string, agentId?: AgentId): KnowledgeSearchResult[] {
    const results = this.sources.flatMap((source) => source.search(query));
    const filtered = agentId ? results.filter((r) => r.article.agentIds.includes(agentId)) : results;
    return filtered.sort((a, b) => b.score - a.score).slice(0, 3);
  }
}

let instance: MockKnowledgeProvider | null = null;

export function getKnowledgeProvider(): KnowledgeProvider {
  if (!instance) instance = new MockKnowledgeProvider();
  return instance;
}
