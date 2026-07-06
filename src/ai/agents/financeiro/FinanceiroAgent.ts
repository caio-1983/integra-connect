import type { AgentConfig, AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';
import { BaseAgent } from '../BaseAgent';
import { MOCK_AGENT_CONFIGS } from '@/lib/mockAIData';

const DEFAULT_CONFIG = MOCK_AGENT_CONFIGS.find((c) => c.id === 'financeiro')!;

/** Prepared structure only — not implemented this sprint. */
class FinanceiroAgent extends BaseAgent {
  readonly id: AgentId = 'financeiro';
  readonly config: AgentConfig = DEFAULT_CONFIG;

  canHandle(_context: AgentContext): boolean {
    return false;
  }

  async execute(_context: AgentContext): Promise<AgentExecutionResult> {
    throw new Error('FinanceiroAgent ainda não implementado nesta sprint.');
  }
}

export function createFinanceiroAgent(): FinanceiroAgent {
  return new FinanceiroAgent();
}
