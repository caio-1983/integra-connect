import type { AgentConfig, AgentId } from '@/ai/types';
import { MOCK_AGENT_CONFIGS } from '@/lib/mockAIData';

const STORAGE_KEY = 'ic_agent_configs_v1';

type Overrides = Partial<Record<AgentId, Partial<AgentConfig>>>;

function readOverrides(): Overrides {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Overrides) : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Overrides): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage unavailable — mock persistence is best-effort.
  }
}

export function getAgentConfig(id: AgentId): AgentConfig {
  const base = MOCK_AGENT_CONFIGS.find((c) => c.id === id)!;
  const override = readOverrides()[id];
  return override ? { ...base, ...override } : base;
}

export function getAllAgentConfigs(): AgentConfig[] {
  return MOCK_AGENT_CONFIGS.map((c) => getAgentConfig(c.id));
}

export function updateAgentConfig(id: AgentId, partial: Partial<AgentConfig>): AgentConfig {
  const overrides = readOverrides();
  overrides[id] = { ...overrides[id], ...partial };
  writeOverrides(overrides);
  return getAgentConfig(id);
}
