import type { PipelineState } from '../../types/index.js';
import { classifyIntent, classifySentiment, extractEntities } from '../../utils/nlpHeuristics.js';
import { memoryProvider } from '../../memory/InMemoryMemoryProvider.js';

export async function postProcessingStep(state: PipelineState): Promise<PipelineState> {
  const text = state.latestCustomerMessage?.content ?? '';
  const intent = classifyIntent(text);
  const sentiment = classifySentiment(text);

  const extracted = extractEntities(text);
  if (Object.keys(extracted).length > 0) {
    memoryProvider.remember({
      scope: { conversationId: state.toolExecutionContext.conversationId, contactId: state.toolExecutionContext.contactId },
      kind: 'customer',
      content: JSON.stringify(extracted),
      metadata: { ...extracted },
    });
  }

  return { ...state, intent, sentiment };
}
