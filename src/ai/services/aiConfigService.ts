import type { AgentId, AIProviderId } from '@/ai/types';

const STORAGE_KEY = 'ic_ai_config_v1';

export interface AIConfig {
  autonomousEnabled: boolean;
  defaultAgentId: AgentId;
  activeProviderId: AIProviderId;
  confidenceThreshold: number;
  maxFailedAttempts: number;
}

const DEFAULT_CONFIG: AIConfig = {
  autonomousEnabled: true,
  defaultAgentId: 'atendimento',
  activeProviderId: 'local',
  confidenceThreshold: 0.55,
  maxFailedAttempts: 3,
};

export function getAIConfig(): AIConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function updateAIConfig(partial: Partial<AIConfig>): AIConfig {
  const next = { ...getAIConfig(), ...partial };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable — mock persistence is best-effort.
    }
  }
  return next;
}
