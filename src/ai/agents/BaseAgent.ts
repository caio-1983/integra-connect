import type { Agent, AgentConfig, AgentContext, AgentExecutionResult, AgentId, HandoffDecision } from '@/ai/types';

/**
 * Base class every agent extends — mirrors `BaseChannelProvider`'s role for
 * channels. Holds only `config`, never a provider reference (agents talk to
 * models via `modelGateway`, never to a provider directly — see
 * `AtendimentoAgent`). A new agent needs: a class extending this, a
 * `createXAgent()` factory (never export the class raw), one line in
 * `src/ai/agents/registry.ts`, and an entry in `MOCK_AGENT_CONFIGS`.
 */
export abstract class BaseAgent implements Agent {
  abstract readonly id: AgentId;
  abstract readonly config: AgentConfig;

  canHandle(_context: AgentContext): boolean {
    return this.config.status === 'active';
  }

  abstract execute(context: AgentContext): Promise<AgentExecutionResult>;

  handoff(_context: AgentContext, result: AgentExecutionResult): HandoffDecision {
    return result.handoff;
  }
}
