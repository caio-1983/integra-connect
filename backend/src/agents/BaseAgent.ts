import type { Agent, AgentConfig, AgentId, AgentPromptDefinition } from '../types/index.js';

/**
 * An agent is a config + prompt bundle — it does not run its own execution
 * loop. `AgentRuntime`/`Pipeline` own the "how"; the agent only owns the
 * "what" (model, tools, system prompt, eligibility).
 */
export abstract class BaseAgent implements Agent {
  abstract readonly id: AgentId;
  abstract readonly config: AgentConfig;
  abstract readonly promptDefinition: AgentPromptDefinition;

  canHandle(_channel: string): boolean {
    return this.config.status === 'active';
  }
}
