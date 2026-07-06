import type { AIEvent, AIEventType } from '@/ai/types';

/**
 * Local AI event bus — CustomEvent-based, mirrors channel-service.ts's
 * publishInboundEvent/subscribeToInboundEvents idiom. Stays entirely
 * in-process this sprint; Analytics/Automações can subscribe to the same
 * event types later without any change here.
 */
const EVENT_NAME = 'integra:ai-event';

export function publishAIEvent(event: AIEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<AIEvent>(EVENT_NAME, { detail: event }));
}

export function subscribeToAIEvents(
  handler: (event: AIEvent) => void,
  filter?: { conversationId?: string; types?: AIEventType[] },
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<AIEvent>).detail;
    if (filter?.conversationId && detail.conversationId !== filter.conversationId) return;
    if (filter?.types && !filter.types.includes(detail.type)) return;
    handler(detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
