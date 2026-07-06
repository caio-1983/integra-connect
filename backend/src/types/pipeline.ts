import type { Agent, IncomingMessage } from './agent.js';
import type { ExecutionContext, ToolExecutionContext } from './execution.js';
import type { MockCompany, MockDeal, MockPerson } from './crm.js';
import type { MemoryRecord } from './memory.js';
import type { KnowledgeSearchResult } from './knowledge.js';
import type { AITool } from './tool.js';
import type { AIChatRequest, AIChatResponse } from './provider.js';
import type { IntentClassification, SentimentClassification } from './copilot.js';
import type { HandoffDecision } from './handoff.js';
import type { AgentChatResponseDTO } from './http.js';

/**
 * The single object threaded through every pipeline step. Each step reads
 * what it needs and returns a new (or mutated) state — no step reaches
 * outside this object to share data with another step.
 */
export interface PipelineState {
  executionContext: ExecutionContext;
  toolExecutionContext: ToolExecutionContext;
  agent: Agent;
  channel: string;
  messages: IncomingMessage[];
  latestCustomerMessage?: IncomingMessage;

  crm?: { person?: MockPerson; company?: MockCompany; deals: MockDeal[] };
  memories?: MemoryRecord[];
  knowledgeHits?: KnowledgeSearchResult[];
  tools?: AITool[];

  /** Model id is filled in by ModelGateway, not by PromptBuilder — the pipeline never picks a model itself before that stage. */
  promptRequest?: Omit<AIChatRequest, 'model'>;
  modelResponse?: AIChatResponse;
  toolsUsed?: string[];

  intent?: IntentClassification;
  sentiment?: SentimentClassification;
  handoff?: HandoffDecision;

  response?: AgentChatResponseDTO;
}

export type PipelineStep = (state: PipelineState) => Promise<PipelineState>;
