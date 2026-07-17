import type { AgentContext, AgentExecutionResult, AgentId } from '@/ai/types';
import { backendBaseUrl, backendHeaders } from '@/services/backendGateway';

/**
 * Thin HTTP client to the Sprint 010 AI Runtime backend. Used only when an
 * agent's `executionMode === 'backend'` — the frontend never picks a model
 * or provider itself, it just forwards the conversation and adapts the
 * response back into the same `AgentExecutionResult` shape `agent.execute()`
 * already returns, so nothing downstream (CopilotPanel, Timeline, handoff
 * flow) needs to know which path produced the reply.
 *
 * Both the AI and WhatsApp surfaces live behind the same backend gateway, so
 * the connection details come from the shared `backendGateway` client. This
 * lazy call means AI is only reached when a `backend`-mode agent actually runs.
 */
export async function chatWithBackendAgent(agentId: AgentId, context: AgentContext): Promise<AgentExecutionResult> {
  const response = await fetch(`${backendBaseUrl()}/v1/agents/${agentId}/chat`, {
    method: 'POST',
    headers: backendHeaders(),
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
