import type { IntentClassification, SentimentClassification } from './copilot.js';
import type { HandoffDecision } from './handoff.js';

/** The 5 agent roles this architecture is prepared for. Only `atendimento` is functional this sprint. */
export type AgentId = 'atendimento' | 'comercial' | 'financeiro' | 'suporte' | 'recepcao';

export interface AgentPromptDefinition {
  systemPrompt: string;
  objective: string;
  restrictions: string[];
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  /** Lower number = evaluated first when routing across agents. */
  priority: number;
  modelId: string;
  toolIds: string[];
  knowledgeSourceIds: string[];
  temperature: number;
}

/**
 * An agent is a config + prompt bundle consulted by the pipeline steps — it
 * does not run its own execution loop. `AgentRuntime`/`Pipeline` own the
 * "how"; the agent only owns the "what" (which model, which tools, which
 * system prompt, whether it's eligible to handle this channel at all).
 */
export interface Agent {
  readonly id: AgentId;
  readonly config: AgentConfig;
  readonly promptDefinition: AgentPromptDefinition;
  canHandle(channel: string): boolean;
}

export interface IncomingMessage {
  fromType: 'user' | 'nina' | 'human';
  content: string;
}

export interface AgentReply {
  content: string;
  intent: IntentClassification;
  sentiment: SentimentClassification;
  confidence: number;
}

export interface AgentExecutionResult {
  reply: AgentReply;
  handoff: HandoffDecision;
  toolsUsed: string[];
}
