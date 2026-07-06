import { useCallback } from 'react';
import { MessageDirection, MessageType } from '@/types';
import type { ConversationStatus, UIConversation, UIMessage } from '@/types';
import type { AgentContext } from '@/ai/types';
import { handleIncomingCustomerMessage } from '@/ai/services/agentOrchestrationService';
import { refreshCopilotState } from '@/ai/services/copilotService';

interface UseAgentRuntimeArgs {
  appendLocalMessage: (conversationId: string, message: UIMessage) => void;
  updateStatus: (conversationId: string, status: ConversationStatus) => Promise<void>;
}

function now(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Wires agentOrchestrationService into the Workspace — the guided "Simular mensagem do cliente" loop. */
export function useAgentRuntime({ appendLocalMessage, updateStatus }: UseAgentRuntimeArgs) {
  const simulateCustomerMessage = useCallback(async (conversation: UIConversation, content: string) => {
    const customerMessage: UIMessage = {
      id: `sim-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      content,
      timestamp: now(),
      direction: MessageDirection.INCOMING,
      type: MessageType.TEXT,
      status: 'delivered',
      fromType: 'user',
      mediaUrl: null,
      whatsappMessageId: null,
      channel: conversation.primaryChannel,
    };
    appendLocalMessage(conversation.id, customerMessage);

    const context: AgentContext = {
      conversationId: conversation.id,
      contactId: conversation.contactId,
      contactName: conversation.contactName,
      channel: conversation.primaryChannel,
      messages: [...conversation.messages, customerMessage],
      clientMemory: conversation.clientMemory,
      mode: 'autonomous',
      latestCustomerMessage: customerMessage,
    };

    const { result, newStatus } = await handleIncomingCustomerMessage(context);

    const aiMessage: UIMessage = {
      id: `ai-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      content: result.reply.content,
      timestamp: now(),
      direction: MessageDirection.OUTGOING,
      type: MessageType.TEXT,
      status: 'sent',
      fromType: 'nina',
      mediaUrl: null,
      whatsappMessageId: null,
      channel: conversation.primaryChannel,
    };
    appendLocalMessage(conversation.id, aiMessage);

    if (newStatus && newStatus !== conversation.status) {
      await updateStatus(conversation.id, newStatus);
    }

    await refreshCopilotState({ ...context, messages: [...context.messages, aiMessage] });
  }, [appendLocalMessage, updateStatus]);

  return { simulateCustomerMessage };
}
