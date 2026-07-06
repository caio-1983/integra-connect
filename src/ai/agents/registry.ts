import type { Agent, AgentId } from '@/ai/types';
import { createAtendimentoAgent } from './atendimento/AtendimentoAgent';
import { createComercialAgent } from './comercial/ComercialAgent';
import { createFinanceiroAgent } from './financeiro/FinanceiroAgent';
import { createSuporteAgent } from './suporte/SuporteAgent';
import { createRecepcaoAgent } from './recepcao/RecepcaoAgent';

export const AGENT_REGISTRY: Record<AgentId, () => Agent> = {
  atendimento: createAtendimentoAgent,
  comercial: createComercialAgent,
  financeiro: createFinanceiroAgent,
  suporte: createSuporteAgent,
  recepcao: createRecepcaoAgent,
};
