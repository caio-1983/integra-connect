import type { ConversationStatus } from '@/types';
import type { Agent, AgentContext, AgentExecutionResult, HandoffDecision } from '@/ai/types';
import { getAgent, getAllAgents } from './agent-factory';
import * as HandoffService from './HandoffService';
import { logAgentStarted } from './timelineService';
import { getOrInitSession, updateSession } from './agentSessionService';
import { publishAIEvent } from './aiEventBus';
import { chatWithBackendAgent } from './backendAgentClient';

/** Priority-sorted agent resolution — prep for future multi-agent routing (only `atendimento` is active this sprint). */
export function resolveAgentForContext(context: AgentContext): Agent | undefined {
  return getAllAgents()
    .slice()
    .sort((a, b) => a.config.priority - b.config.priority)
    .find((agent) => agent.canHandle(context));
}

export interface OrchestrationResult {
  result: AgentExecutionResult;
  newStatus?: ConversationStatus;
}

/**
 * The Entrega 3/16 heart: runs the active agent, evaluates handoff, and — if
 * the decided next agent can't handle it (true for every stub agent today) —
 * cascades the handoff to a human. This is what makes the multi-agent chain
 * (Cliente → Atendimento → Comercial → Financeiro → Humano) structurally
 * real without special-casing any single agent.
 */
export async function handleIncomingCustomerMessage(context: AgentContext): Promise<OrchestrationResult> {
  const session = getOrInitSession(context.conversationId, 'atendimento');
  const isFirstMessage = session.processedMessageIds.length === 0 && session.handoffHistory.length === 0;
  if (isFirstMessage) {
    logAgentStarted(context.conversationId, context.contactId, 'Nina');
  }

  const agent = getAgent(session.activeAgentId);
  const result = agent.config.executionMode === 'backend'
    ? await chatWithBackendAgent(agent.id, context)
    : await agent.execute(context);
  const at = new Date().toISOString();

  publishAIEvent({ type: 'AIReplyGenerated', conversationId: context.conversationId, content: result.reply.content, at });
  publishAIEvent({ type: 'IntentDetected', conversationId: context.conversationId, intent: result.reply.intent, at });
  publishAIEvent({ type: 'SentimentDetected', conversationId: context.conversationId, sentiment: result.reply.sentiment, at });

  let decision: HandoffDecision = agent.handoff(context, result);

  if (decision.required && decision.targetType === 'agent' && decision.targetAgentId) {
    const nextAgent = getAgent(decision.targetAgentId);
    if (!nextAgent.canHandle(context)) {
      decision = { ...decision, targetType: 'human' };
    }
  }

  const messageId = context.latestCustomerMessage?.id;
  updateSession(context.conversationId, {
    processedMessageIds: messageId ? [...session.processedMessageIds, messageId] : session.processedMessageIds,
  });

  if (!decision.required) {
    return { result: { ...result, handoff: decision } };
  }

  const { newStatus } = HandoffService.execute(context, decision);
  return { result: { ...result, handoff: decision }, newStatus };
}
