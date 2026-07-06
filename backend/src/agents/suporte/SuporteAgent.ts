import type { AgentConfig, AgentId, AgentPromptDefinition } from '../../types/index.js';
import { BaseAgent } from '../BaseAgent.js';

const CONFIG: AgentConfig = {
  id: 'suporte',
  name: 'Suporte',
  description: 'Resolve dúvidas técnicas e problemas de uso da plataforma.',
  status: 'draft',
  priority: 3,
  modelId: 'gpt-4.1',
  toolIds: ['knowledge_search', 'workflow_trigger'],
  knowledgeSourceIds: ['faq'],
  temperature: 0.7,
};

const PROMPT: AgentPromptDefinition = { systemPrompt: '', objective: '', restrictions: [] };

/** Prepared structure only — `status: 'draft'` means `canHandle()` always returns false this sprint. */
class SuporteAgent extends BaseAgent {
  readonly id: AgentId = 'suporte';
  readonly config: AgentConfig = CONFIG;
  readonly promptDefinition: AgentPromptDefinition = PROMPT;
}

export function createSuporteAgent(): SuporteAgent {
  return new SuporteAgent();
}
