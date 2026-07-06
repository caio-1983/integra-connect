import type { AIChatMessage, AIToolSchema, PipelineState } from '../../types/index.js';

function buildDeveloperMessage(state: PipelineState): string {
  const { crm, memories, knowledgeHits, tools, channel } = state;
  const lines: string[] = [];

  if (crm?.person) {
    lines.push(`Cliente: ${crm.person.name}${crm.company ? ` (${crm.company.razaoSocial})` : ''}`);
  }
  if (crm?.deals && crm.deals.length > 0) {
    lines.push(`Negócios em aberto: ${crm.deals.map((d) => d.title).join(', ')}`);
  }
  if (memories && memories.length > 0) {
    lines.push(`Memórias relevantes: ${memories.map((m) => m.content).join(' | ')}`);
  }
  if (knowledgeHits && knowledgeHits.length > 0) {
    lines.push(`Base de conhecimento relevante: ${knowledgeHits.map((k) => k.article.title).join(', ')}`);
  }
  if (tools && tools.length > 0) {
    lines.push(`Ferramentas disponíveis: ${tools.map((t) => t.name).join(', ')}`);
  }
  lines.push(`Canal de origem: ${channel}`);

  return lines.join('\n');
}

function toToolSchema(tool: NonNullable<PipelineState['tools']>[number]): AIToolSchema {
  return { name: tool.id, description: tool.description, parameters: tool.parameters };
}

/**
 * Assembles the final prompt from everything the earlier steps gathered —
 * no agent class ever concatenates prompt strings itself, and nothing here
 * is hardcoded per agent beyond the raw fragments in `prompts/*.prompts.ts`.
 */
export async function buildPromptStep(state: PipelineState): Promise<PipelineState> {
  const { promptDefinition, config } = state.agent;

  const systemContent = [
    promptDefinition.systemPrompt,
    `Objetivo: ${promptDefinition.objective}`,
    promptDefinition.restrictions.length > 0 ? `Restrições:\n- ${promptDefinition.restrictions.join('\n- ')}` : '',
  ].filter(Boolean).join('\n\n');

  const history: AIChatMessage[] = state.messages.map((m) => ({
    role: m.fromType === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const messages: AIChatMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'developer', content: buildDeveloperMessage(state) },
    ...history,
  ];

  const tools = (state.tools ?? []).map(toToolSchema);

  return {
    ...state,
    promptRequest: {
      messages,
      temperature: config.temperature,
      tools: tools.length > 0 ? tools : undefined,
    },
  };
}
