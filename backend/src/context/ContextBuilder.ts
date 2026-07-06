import type { AITool, PipelineState } from '../types/index.js';
import type { MockCompany, MockDeal, MockPerson } from '../types/index.js';
import { crmTool } from '../tools/crmTool.js';
import { getToolsByIds } from '../tools/registry.js';

export interface CoreContext {
  crm: { person?: MockPerson; company?: MockCompany; deals: MockDeal[] };
  tools: AITool[];
}

/**
 * Gathers CRM data and resolves the agent's available tools — the first
 * pipeline stage after the request arrives. Memory recall and knowledge
 * search are separate stages (`recallMemoryStep`/`searchKnowledgeStep`) so
 * each concern can evolve independently (e.g. knowledge becomes real RAG
 * later without touching this file).
 */
export async function buildCoreContext(state: PipelineState): Promise<CoreContext> {
  const crmResult = await crmTool.execute(
    { contactId: state.toolExecutionContext.contactId },
    state.toolExecutionContext,
  );
  const crm = (crmResult.data ?? { deals: [] }) as CoreContext['crm'];
  const tools = getToolsByIds(state.agent.config.toolIds);
  return { crm, tools };
}
