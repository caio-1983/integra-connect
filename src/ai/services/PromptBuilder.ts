import type { AIChatMessage, AIChatRequest } from '@/ai/types';
import type { EnrichedContext } from './ContextBuilder';

/**
 * Raw prompt fragments an agent provides (see `src/ai/prompts/`). No agent
 * class ever concatenates prompt strings itself — this is the only place a
 * final `AIChatRequest` gets assembled from context + fragments.
 */
export interface AgentPromptDefinition {
  systemPrompt: string;
  objective: string;
  restrictions: string[];
}

function buildDeveloperMessage(enriched: EnrichedContext): string {
  const { crm, timelineEntries, knowledgeHits, tools, agentContext } = enriched;
  const lines: string[] = [];

  if (crm.person) {
    lines.push(`Cliente: ${crm.person.name}${crm.company ? ` (${crm.company.razaoSocial})` : ''}`);
  }
  if (crm.deals.length > 0) {
    lines.push(`Negócios em aberto: ${crm.deals.map((d) => d.title).join(', ')}`);
  }
  if (timelineEntries.length > 0) {
    lines.push(`Histórico recente: ${timelineEntries.map((t) => t.content).join(' | ')}`);
  }
  if (knowledgeHits.length > 0) {
    lines.push(`Base de conhecimento relevante: ${knowledgeHits.map((k) => k.article.title).join(', ')}`);
  }
  if (tools.length > 0) {
    lines.push(`Ferramentas disponíveis: ${tools.map((t) => t.name).join(', ')}`);
  }
  lines.push(`Canal de origem: ${agentContext.channel}`);

  return lines.join('\n');
}

export function buildPrompt(enriched: EnrichedContext, promptDef: AgentPromptDefinition): AIChatRequest {
  const systemContent = [
    promptDef.systemPrompt,
    `Objetivo: ${promptDef.objective}`,
    promptDef.restrictions.length > 0 ? `Restrições:\n- ${promptDef.restrictions.join('\n- ')}` : '',
  ].filter(Boolean).join('\n\n');

  const history: AIChatMessage[] = enriched.agentContext.messages.map((m) => ({
    role: m.fromType === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const messages: AIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'developer', content: buildDeveloperMessage(enriched) },
    ...history,
  ];

  return { messages, modelId: enriched.model.id };
}
