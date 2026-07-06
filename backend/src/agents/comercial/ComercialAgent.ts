import type { AgentConfig, AgentId, AgentPromptDefinition } from '../../types/index.js';
import { BaseAgent } from '../BaseAgent.js';

const CONFIG: AgentConfig = {
  id: 'comercial',
  name: 'Comercial',
  description: 'Conduz negociações, propostas e fechamento de negócios.',
  status: 'draft',
  priority: 4,
  modelId: 'gpt-4.1',
  toolIds: ['crm_lookup', 'scheduling_suggest_slots'],
  knowledgeSourceIds: ['faq'],
  temperature: 0.7,
};

const PROMPT: AgentPromptDefinition = { systemPrompt: '', objective: '', restrictions: [] };

/** Prepared structure only — `status: 'draft'` means `canHandle()` always returns false this sprint. */
class ComercialAgent extends BaseAgent {
  readonly id: AgentId = 'comercial';
  readonly config: AgentConfig = CONFIG;
  readonly promptDefinition: AgentPromptDefinition = PROMPT;
}

export function createComercialAgent(): ComercialAgent {
  return new ComercialAgent();
}
