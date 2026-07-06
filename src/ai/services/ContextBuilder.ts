import type { Company, Deal, Person, TimelineEntry } from '@/types';
import type { AgentConfig, AgentContext, AIModel, AITool, KnowledgeSearchResult, MemoryRecord } from '@/ai/types';
import { MOCK_TIMELINE_ENTRIES } from '@/constants';
import { crmTool } from '@/ai/tools/crmTool';
import { getToolsByIds } from '@/ai/tools/registry';
import { getKnowledgeProvider } from './knowledgeService';
import { getMemoryProvider } from '@/ai/memory';
import { resolveModel } from './modelGateway';

/**
 * Everything an agent needs to answer, gathered in one place, before any
 * prompt is built or any model is called. Providers only ever receive an
 * already-prepared request (see `PromptBuilder`) — no agent reaches into
 * CRM/timeline/memory/knowledge itself.
 */
export interface EnrichedContext {
  agentContext: AgentContext;
  agentConfig: AgentConfig;
  crm: { person?: Person; company?: Company; deals: Deal[] };
  timelineEntries: TimelineEntry[];
  memories: MemoryRecord[];
  knowledgeHits: KnowledgeSearchResult[];
  tools: AITool[];
  model: AIModel;
}

export async function buildContext(context: AgentContext, agentConfig: AgentConfig): Promise<EnrichedContext> {
  const crmResult = await crmTool.execute({ contactId: context.contactId });
  const crm = (crmResult.data ?? { deals: [] }) as EnrichedContext['crm'];

  const timelineEntries = MOCK_TIMELINE_ENTRIES
    .filter((e) => e.personId === context.contactId)
    .slice(0, 5);

  const memories = getMemoryProvider().recall({
    conversationId: context.conversationId,
    personId: context.contactId,
  });

  const query = context.latestCustomerMessage?.content ?? '';
  const knowledgeHits = query ? getKnowledgeProvider().search(query, agentConfig.id) : [];

  const tools = getToolsByIds(agentConfig.toolIds);
  const model = resolveModel(agentConfig.modelId);

  return { agentContext: context, agentConfig, crm, timelineEntries, memories, knowledgeHits, tools, model };
}
