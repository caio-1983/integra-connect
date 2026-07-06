import type { Agent, AgentId } from '../types/index.js';
import { createAtendimentoAgent } from './atendimento/AtendimentoAgent.js';
import { createComercialAgent } from './comercial/ComercialAgent.js';
import { createFinanceiroAgent } from './financeiro/FinanceiroAgent.js';
import { createSuporteAgent } from './suporte/SuporteAgent.js';
import { createRecepcaoAgent } from './recepcao/RecepcaoAgent.js';

export const AGENT_REGISTRY: Record<AgentId, () => Agent> = {
  atendimento: createAtendimentoAgent,
  comercial: createComercialAgent,
  financeiro: createFinanceiroAgent,
  suporte: createSuporteAgent,
  recepcao: createRecepcaoAgent,
};

const instances = new Map<AgentId, Agent>();

export function getAgent(id: AgentId): Agent {
  let instance = instances.get(id);
  if (!instance) {
    instance = AGENT_REGISTRY[id]();
    instances.set(id, instance);
  }
  return instance;
}

export function getAllAgents(): Agent[] {
  return (Object.keys(AGENT_REGISTRY) as AgentId[]).map(getAgent);
}
