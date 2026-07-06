import type { AgentId } from './agent';

export type HandoffReason =
  | 'low_confidence'
  | 'customer_requested_human'
  | 'financial_subject'
  | 'critical_complaint'
  | 'repeated_failures';

export interface HandoffDecision {
  required: boolean;
  targetType: 'agent' | 'human';
  targetAgentId?: AgentId;
  reason?: HandoffReason;
  /** Optional line said to the customer right before the handoff. */
  message?: string;
}
