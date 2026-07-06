import type { HandoffDecision, PipelineState } from '../../types/index.js';
import { countConsecutiveAgentReplies, customerRequestedHuman } from '../../utils/nlpHeuristics.js';
import { getAgent } from '../../agents/registry.js';
import { aiEventBus } from '../EventBus.js';

const CONFIDENCE_THRESHOLD = 0.55;
const MAX_CONSECUTIVE_REPLIES = 3;

/** Ported from the frontend's `HandoffService.evaluate()` — same rules, same agent. */
function evaluate(state: PipelineState): HandoffDecision {
  const customerText = state.latestCustomerMessage?.content ?? '';
  const intent = state.intent!;
  const sentiment = state.sentiment!;

  if (customerRequestedHuman(customerText)) {
    return { required: true, targetType: 'human', reason: 'customer_requested_human', message: 'Só um momento, vou te conectar com um de nossos atendentes.' };
  }
  if (sentiment.sentiment === 'Crítico') {
    return { required: true, targetType: 'human', reason: 'critical_complaint', message: 'Sinto muito pelo ocorrido — vou te transferir para um atendente humano agora mesmo.' };
  }
  if (intent.intent === 'Financeiro') {
    // Routed to the (not-yet-active) financeiro agent first — cascades to human below since it can't handle it yet.
    return { required: true, targetType: 'agent', targetAgentId: 'financeiro', reason: 'financial_subject', message: 'Vou te transferir para o time financeiro para resolver isso com mais precisão.' };
  }
  if (intent.confidence < CONFIDENCE_THRESHOLD) {
    return { required: true, targetType: 'human', reason: 'low_confidence', message: 'Vou te transferir para um atendente para garantir a melhor resposta.' };
  }
  if (countConsecutiveAgentReplies(state.messages) >= MAX_CONSECUTIVE_REPLIES) {
    return { required: true, targetType: 'human', reason: 'repeated_failures', message: 'Vou chamar um atendente humano para continuar te ajudando.' };
  }

  return { required: false, targetType: 'human' };
}

export async function handoffStep(state: PipelineState): Promise<PipelineState> {
  let decision = evaluate(state);

  if (decision.required && decision.targetType === 'agent' && decision.targetAgentId) {
    const nextAgent = getAgent(decision.targetAgentId);
    if (!nextAgent.canHandle(state.channel)) {
      decision = { ...decision, targetType: 'human' };
    }
  }

  aiEventBus.publish({
    type: 'handoff.decided',
    executionContext: state.executionContext,
    payload: { decision },
    timestamp: new Date(),
  });

  return { ...state, handoff: decision };
}
