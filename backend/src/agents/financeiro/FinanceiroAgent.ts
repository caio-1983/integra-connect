import type { AgentConfig, AgentId, AgentPromptDefinition } from '../../types/index.js';
import { BaseAgent } from '../BaseAgent.js';

const CONFIG: AgentConfig = {
  id: 'financeiro',
  name: 'Financeiro',
  description: 'Trata cobranças, faturas e questões financeiras.',
  status: 'draft',
  priority: 5,
  modelId: 'gpt-4.1',
  toolIds: ['finance_check_invoice'],
  knowledgeSourceIds: ['faq'],
  temperature: 0.7,
};

const PROMPT: AgentPromptDefinition = { systemPrompt: '', objective: '', restrictions: [] };

/** Prepared structure only — `status: 'draft'` means `canHandle()` always returns false this sprint. */
class FinanceiroAgent extends BaseAgent {
  readonly id: AgentId = 'financeiro';
  readonly config: AgentConfig = CONFIG;
  readonly promptDefinition: AgentPromptDefinition = PROMPT;
}

export function createFinanceiroAgent(): FinanceiroAgent {
  return new FinanceiroAgent();
}
