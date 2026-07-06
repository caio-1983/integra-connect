import type { ConversationStatus } from '@/types';
import type { AgentContext, HandoffDecision, IntentClassification, SentimentClassification } from '@/ai/types';
import { countConsecutiveAgentReplies, customerRequestedHuman } from './nlpHeuristics';
import { publishAIEvent } from './aiEventBus';
import { logAgentTransferred } from './timelineService';
import { getOrInitSession, updateSession } from './agentSessionService';

const CONFIDENCE_THRESHOLD = 0.55;
const MAX_CONSECUTIVE_REPLIES = 3;

/**
 * Centralizes all handoff logic — agents only decide *what to reply*;
 * whether to transfer is decided here so the rule set can evolve (or gain
 * per-agent overrides) without touching agent classes. Every handoff goes
 * through `evaluate()` then, if required, `execute()`.
 */
export function evaluate(
  context: AgentContext,
  intent: IntentClassification,
  sentiment: SentimentClassification,
  confidence: number,
): HandoffDecision {
  const customerText = context.latestCustomerMessage?.content ?? '';

  if (customerRequestedHuman(customerText)) {
    return {
      required: true,
      targetType: 'human',
      reason: 'customer_requested_human',
      message: 'Só um momento, vou te conectar com um de nossos atendentes.',
    };
  }
  if (sentiment.sentiment === 'Crítico') {
    return {
      required: true,
      targetType: 'human',
      reason: 'critical_complaint',
      message: 'Sinto muito pelo ocorrido — vou te transferir para um atendente humano agora mesmo.',
    };
  }
  if (intent.intent === 'Financeiro') {
    // Routed to the (not-yet-active) financeiro agent first — the
    // orchestrator cascades to human since it can't handle it yet.
    return {
      required: true,
      targetType: 'agent',
      targetAgentId: 'financeiro',
      reason: 'financial_subject',
      message: 'Vou te transferir para o time financeiro para resolver isso com mais precisão.',
    };
  }
  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      required: true,
      targetType: 'human',
      reason: 'low_confidence',
      message: 'Vou te transferir para um atendente para garantir a melhor resposta.',
    };
  }
  if (countConsecutiveAgentReplies(context.messages) >= MAX_CONSECUTIVE_REPLIES) {
    return {
      required: true,
      targetType: 'human',
      reason: 'repeated_failures',
      message: 'Vou chamar um atendente humano para continuar te ajudando.',
    };
  }

  return { required: false, targetType: 'human' };
}

export function execute(context: AgentContext, decision: HandoffDecision): { newStatus: ConversationStatus } {
  publishAIEvent({ type: 'HandoffStarted', conversationId: context.conversationId, decision, at: new Date().toISOString() });

  const session = getOrInitSession(context.conversationId, 'atendimento');
  if (decision.reason) {
    updateSession(context.conversationId, {
      mode: 'copilot',
      handoffHistory: [...session.handoffHistory, { reason: decision.reason, at: new Date().toISOString() }],
    });
  }

  logAgentTransferred(context.conversationId, context.contactId, decision.reason);

  publishAIEvent({ type: 'HandoffFinished', conversationId: context.conversationId, decision, at: new Date().toISOString() });

  return { newStatus: 'human' };
}
