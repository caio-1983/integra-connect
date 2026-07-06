import type { AgentConfig, AgentId, AgentPromptDefinition } from '../../types/index.js';
import { BaseAgent } from '../BaseAgent.js';

const CONFIG: AgentConfig = {
  id: 'recepcao',
  name: 'Recepção',
  description: 'Triagem inicial de novos contatos antes de rotear para o agente especializado.',
  status: 'draft',
  priority: 1,
  modelId: 'gpt-4.1',
  toolIds: ['crm_lookup'],
  knowledgeSourceIds: ['faq'],
  temperature: 0.7,
};

const PROMPT: AgentPromptDefinition = { systemPrompt: '', objective: '', restrictions: [] };

/** Prepared structure only — `status: 'draft'` means `canHandle()` always returns false this sprint. */
class RecepcaoAgent extends BaseAgent {
  readonly id: AgentId = 'recepcao';
  readonly config: AgentConfig = CONFIG;
  readonly promptDefinition: AgentPromptDefinition = PROMPT;
}

export function createRecepcaoAgent(): RecepcaoAgent {
  return new RecepcaoAgent();
}
