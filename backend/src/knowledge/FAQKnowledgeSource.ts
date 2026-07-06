import type { KnowledgeSearchResult, KnowledgeSource } from '../types/index.js';
import { MOCK_KNOWLEDGE_ARTICLES } from './mockKnowledgeData.js';

function score(query: string, haystack: string): number {
  const q = query.toLowerCase();
  const h = haystack.toLowerCase();
  if (!q.trim()) return 0;
  const words = q.split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => h.includes(w)).length;
  return words.length > 0 ? hits / words.length : 0;
}

/** The only KnowledgeSource implemented this sprint — keyword match over a static FAQ list, no vector search (RAG is Entrega 5, deferred). */
export const faqKnowledgeSource: KnowledgeSource = {
  id: 'faq',
  name: 'FAQ',
  type: 'faq',
  search(query: string): KnowledgeSearchResult[] {
    return MOCK_KNOWLEDGE_ARTICLES
      .map((article) => ({ article, score: score(query, `${article.title} ${article.content} ${article.tags.join(' ')}`) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  },
};
