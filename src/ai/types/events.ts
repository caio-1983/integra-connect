import type { IntentClassification, SentimentClassification, ConversationSummary } from './copilot';
import type { HandoffDecision } from './handoff';
import type { ToolResult } from './tool';
import type { KnowledgeSearchResult } from './knowledge';

/**
 * Local AI event bus payloads. Everything stays in-process this sprint
 * (see `src/ai/services/aiEventBus.ts`); Analytics/Automações can subscribe
 * to the same event types later without any change here.
 */
export type AIEventType =
  | 'AIReplyGenerated'
  | 'SummaryUpdated'
  | 'IntentDetected'
  | 'SentimentDetected'
  | 'ToolExecuted'
  | 'KnowledgeMatched'
  | 'HandoffStarted'
  | 'HandoffFinished';

interface AIEventBase {
  conversationId: string;
  at: string;
}

export interface AIReplyGeneratedEvent extends AIEventBase {
  type: 'AIReplyGenerated';
  content: string;
}

export interface SummaryUpdatedEvent extends AIEventBase {
  type: 'SummaryUpdated';
  summary: ConversationSummary;
}

export interface IntentDetectedEvent extends AIEventBase {
  type: 'IntentDetected';
  intent: IntentClassification;
}

export interface SentimentDetectedEvent extends AIEventBase {
  type: 'SentimentDetected';
  sentiment: SentimentClassification;
}

export interface ToolExecutedEvent extends AIEventBase {
  type: 'ToolExecuted';
  toolId: string;
  result: ToolResult;
}

export interface KnowledgeMatchedEvent extends AIEventBase {
  type: 'KnowledgeMatched';
  results: KnowledgeSearchResult[];
}

export interface HandoffStartedEvent extends AIEventBase {
  type: 'HandoffStarted';
  decision: HandoffDecision;
}

export interface HandoffFinishedEvent extends AIEventBase {
  type: 'HandoffFinished';
  decision: HandoffDecision;
}

export type AIEvent =
  | AIReplyGeneratedEvent
  | SummaryUpdatedEvent
  | IntentDetectedEvent
  | SentimentDetectedEvent
  | ToolExecutedEvent
  | KnowledgeMatchedEvent
  | HandoffStartedEvent
  | HandoffFinishedEvent;
