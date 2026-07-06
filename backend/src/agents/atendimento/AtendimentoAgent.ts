import type { AgentConfig, AgentId, AgentPromptDefinition } from '../../types/index.js';
import { BaseAgent } from '../BaseAgent.js';
import { ATENDIMENTO_PROMPT } from '../../prompts/atendimento.prompts.js';

const CONFIG: AgentConfig = {
  id: 'atendimento',
  name: 'Nina — Atendimento',
  description: 'Atende o cliente de forma autônoma e assiste o operador como Copilot após o handoff.',
  status: 'active',
  priority: 2,
  modelId: 'gpt-4.1',
  toolIds: ['crm_lookup', 'scheduling_suggest_slots', 'knowledge_search'],
  knowledgeSourceIds: ['faq'],
  temperature: 0.7,
};

/** The only functional agent this sprint — same role as its frontend mock counterpart, real execution now. */
class AtendimentoAgent extends BaseAgent {
  readonly id: AgentId = 'atendimento';
  readonly config: AgentConfig = CONFIG;
  readonly promptDefinition: AgentPromptDefinition = ATENDIMENTO_PROMPT;
}

export function createAtendimentoAgent(): AtendimentoAgent {
  return new AtendimentoAgent();
}
