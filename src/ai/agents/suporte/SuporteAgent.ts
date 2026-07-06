import type { AgentConfig, AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';
import { BaseAgent } from '../BaseAgent';
import { MOCK_AGENT_CONFIGS } from '@/lib/mockAIData';

const DEFAULT_CONFIG = MOCK_AGENT_CONFIGS.find((c) => c.id === 'suporte')!;

/** Prepared structure only — not implemented this sprint. */
class SuporteAgent extends BaseAgent {
  readonly id: AgentId = 'suporte';
  readonly config: AgentConfig = DEFAULT_CONFIG;

  canHandle(_context: AgentContext): boolean {
    return false;
  }

  async execute(_context: AgentContext): Promise<AgentExecutionResult> {
    throw new Error('SuporteAgent ainda não implementado nesta sprint.');
  }
}

export function createSuporteAgent(): SuporteAgent {
  return new SuporteAgent();
}
