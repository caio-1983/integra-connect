import type { AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';

/**
 * Thin HTTP client to the Sprint 010 AI Runtime backend. Used only when an
 * agent's `executionMode === 'backend'` — the frontend never picks a model
 * or provider itself, it just forwards the conversation and adapts the
 * response back into the same `AgentExecutionResult` shape `agent.execute()`
 * already returns, so nothing downstream (CopilotPanel, Timeline, handoff
 * flow) needs to know which path produced the reply.
 */
function getGatewayUrl(): string {
  const url = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!url) throw new Error('[ai] VITE_AI_GATEWAY_URL não configurado — defina no .env para usar o modo "Backend (real)".');
  return url;
}

function getGatewayKey(): string {
  const key = import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined;
  if (!key) throw new Error('[ai] VITE_AI_GATEWAY_KEY não configurado — defina no .env para usar o modo "Backend (real)".');
  return key;
}

export async function chatWithBackendAgent(agentId: AgentId, context: AgentContext): Promise<AgentExecutionResult> {
  const response = await fetch(`${getGatewayUrl()}/v1/agents/${agentId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getGatewayKey()}`,
    },
    body: JSON.stringify({
      conversationId: context.conversationId,
      contactId: context.contactId,
      channel: context.channel,
      messages: context.messages.map((m) => ({ fromType: m.fromType, content: m.content })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[ai] Backend respondeu ${response.status}: ${body}`);
  }

  const data = await response.json();

  return {
    reply: {
      content: data.content,
      intent: data.intent,
      sentiment: data.sentiment,
      confidence: data.confidence,
    },
    handoff: data.handoff,
  };
}
