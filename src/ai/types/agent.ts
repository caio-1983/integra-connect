import type { ChannelType, ClientMemory, UIMessage } from '@/types';
import type { IntentClassification, SentimentClassification } from './copilot';
import type { HandoffDecision } from './handoff';
import type { ConversationMode } from './session';

/**
 * The 5 agent roles this architecture is prepared for. Only `atendimento` is
 * functional this sprint — see src/ai/agents/registry.ts and the checklist
 * in BaseAgent.ts for what a new agent needs.
 */
export type AgentId = 'atendimento' | 'comercial' | 'financeiro' | 'suporte' | 'recepcao';

export interface AgentContext {
  conversationId: string;
  contactId: string;
  contactName: string;
  channel: ChannelType;
  /** Full thread, oldest -> newest. */
  messages: UIMessage[];
  clientMemory: ClientMemory;
  mode: ConversationMode;
  latestCustomerMessage?: UIMessage;
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
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  /** Lower number = evaluated first by agentOrchestrationService.resolveAgentForContext. */
  priority: number;
  modelId: string;
  toolIds: string[];
  knowledgeSourceIds: string[];
  /**
   * 'local' (default): runs entirely client-side via LocalAIProvider, same as
   * Sprint 009 — zero network calls, zero cost. 'backend': routes through the
   * Sprint 010 AI Runtime (`backendAgentClient.ts`) instead, which owns model/
   * provider/tool decisions entirely server-side.
   */
  executionMode?: 'local' | 'backend';
}

export interface Agent {
  readonly id: AgentId;
  readonly config: AgentConfig;
  canHandle(context: AgentContext): boolean;
  execute(context: AgentContext): Promise<AgentExecutionResult>;
  handoff(context: AgentContext, result: AgentExecutionResult): HandoffDecision;
}
