import type { AgentConfig, AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';
import { BaseAgent } from '../BaseAgent';
import { MOCK_AGENT_CONFIGS } from '@/lib/mockAIData';

const DEFAULT_CONFIG = MOCK_AGENT_CONFIGS.find((c) => c.id === 'recepcao')!;

/** Prepared structure only — not implemented this sprint. */
class RecepcaoAgent extends BaseAgent {
  readonly id: AgentId = 'recepcao';
  readonly config: AgentConfig = DEFAULT_CONFIG;

  canHandle(_context: AgentContext): boolean {
    return false;
  }

  async execute(_context: AgentContext): Promise<AgentExecutionResult> {
    throw new Error('RecepcaoAgent ainda não implementado nesta sprint.');
  }
}

export function createRecepcaoAgent(): RecepcaoAgent {
  return new RecepcaoAgent();
}
