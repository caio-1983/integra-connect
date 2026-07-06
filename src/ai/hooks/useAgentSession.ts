import { useCallback, useEffect, useState } from 'react';
import type { UIConversation } from '@/types';
import type { AgentContext, AgentId, ConversationMode } from '@/ai/types';
import { getSession } from '@/ai/services/agentSessionService';
import { getCopilotState, refreshCopilotState } from '@/ai/services/copilotService';
import { subscribeToAIEvents } from '@/ai/services/aiEventBus';
import { getAgentConfig } from '@/ai/services/agentConfigService';

function buildAgentContext(conversation: UIConversation, mode: ConversationMode): AgentContext {
  return {
    conversationId: conversation.id,
    contactId: conversation.contactId,
    contactName: conversation.contactName,
    channel: conversation.primaryChannel,
    messages: conversation.messages,
    clientMemory: conversation.clientMemory,
    mode,
    latestCustomerMessage: [...conversation.messages].reverse().find((m) => m.fromType === 'user'),
  };
}

/** Copilot panel data source — subscribes to the AI event bus so it refreshes reactively instead of polling. */
export function useAgentSession(conversation?: UIConversation) {
  const [, forceRefresh] = useState(0);
  const conversationId = conversation?.id;

  useEffect(() => {
    if (!conversationId) return undefined;
    return subscribeToAIEvents(() => forceRefresh((t) => t + 1), { conversationId });
  }, [conversationId]);

  const session = conversationId ? getSession(conversationId) : undefined;
  const copilot = conversationId ? getCopilotState(conversationId) : undefined;
  const mode: ConversationMode = !conversation
    ? 'human_only'
    : session
      ? (conversation.status === 'human' && session.mode === 'autonomous' ? 'copilot' : session.mode)
      : conversation.status === 'nina' ? 'autonomous' : conversation.status === 'human' ? 'human_only' : 'paused';

  const agentId: AgentId = session?.activeAgentId ?? 'atendimento';
  const agentDisplayName = getAgentConfig(agentId).name;

  const refreshSummary = useCallback(async () => {
    if (!conversation) return;
    await refreshCopilotState(buildAgentContext(conversation, mode), agentId);
    forceRefresh((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, mode, agentId]);

  return { session, copilot, mode, agentDisplayName, refreshSummary };
}
