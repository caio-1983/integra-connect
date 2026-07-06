import type { IncomingMessage, AgentReply } from './agent.js';
import type { HandoffDecision } from './handoff.js';

export interface AgentChatRequestDTO {
  conversationId: string;
  contactId: string;
  channel: string;
  messages: IncomingMessage[];
}

export interface AgentChatResponseDTO {
  content: string;
  intent: AgentReply['intent'];
  sentiment: AgentReply['sentiment'];
  confidence: number;
  handoff: HandoffDecision;
  toolsUsed: string[];
}
