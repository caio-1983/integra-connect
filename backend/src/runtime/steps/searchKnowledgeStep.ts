import type { PipelineState } from '../../types/index.js';
import { knowledgeEngine } from '../../knowledge/KnowledgeEngine.js';

export async function searchKnowledgeStep(state: PipelineState): Promise<PipelineState> {
  const query = state.latestCustomerMessage?.content ?? '';
  const knowledgeHits = query ? knowledgeEngine.search(query, state.agent.id) : [];
  return { ...state, knowledgeHits };
}
