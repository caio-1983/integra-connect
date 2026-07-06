import type { AgentId } from './agent';
import type { HandoffReason } from './handoff';

/**
 * Controls AI behavior for a conversation, independent of the existing
 * `ConversationStatus` ('nina'|'human'|'paused' — untouched, still drives who
 * is allowed to send as the outgoing party). `ConversationMode` answers a
 * different question: is the AI driving the conversation, assisting a human,
 * or fully out of the picture. Modeled as a union type (not a TS `enum`) to
 * match this codebase's established convention (see `ChannelType`).
 */
export type ConversationMode = 'autonomous' | 'copilot' | 'human_only' | 'paused';

export interface HandoffHistoryEntry {
  reason: HandoffReason;
  at: string;
}

export interface AgentSession {
  conversationId: string;
  mode: ConversationMode;
  activeAgentId: AgentId;
  handoffHistory: HandoffHistoryEntry[];
  processedMessageIds: string[];
  updatedAt: string;
}
