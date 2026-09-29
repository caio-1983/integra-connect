import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIConversation } from '@/types';
import type { ConversationInsight, InsightMode } from '@/ai/types';
import { fetchConversationInsight } from '@/ai/services/backendAgentClient';

/**
 * Lu as copilot: reads the conversation when it is opened and again whenever a
 * new message lands. The backend only calls the model when the customer spoke
 * last and nothing is cached for that message — otherwise it returns what Lu
 * already read, so opening the same conversation twice costs nothing.
 */
export function useConversationInsight(conversation: UIConversation | undefined) {
  const [insight, setInsight] = useState<ConversationInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const conversationId = conversation?.id;
  const lastMessageId = conversation?.messages[conversation.messages.length - 1]?.id;

  const load = useCallback(async (mode: InsightMode) => {
    if (!conversationId) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchConversationInsight(conversationId, mode);
      if (requestId === requestRef.current) setInsight(result);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      // fetch() rejects with a TypeError when the backend can't be reached at all —
      // a technical detail ("Failed to fetch") the attendant can't act on: stay quiet.
      if (err instanceof TypeError) {
        console.warn('[insight] backend unreachable', err);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'A Lu não conseguiu ler a conversa.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [conversationId]);

  // A new conversation starts clean — never show the previous customer's insight.
  useEffect(() => {
    setInsight(null);
    setError(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !lastMessageId) return;
    void load('default');
  }, [conversationId, lastMessageId, load]);

  const regenerate = useCallback((mode: Exclude<InsightMode, 'default'>) => load(mode), [load]);

  return { insight, loading, error, regenerate };
}
