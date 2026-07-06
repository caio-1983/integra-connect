import type { Agent, AgentId } from '@/ai/types';
import { AGENT_REGISTRY } from '@/ai/agents/registry';

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
