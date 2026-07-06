import type { PipelineState } from '../../types/index.js';
import { memoryProvider } from '../../memory/InMemoryMemoryProvider.js';

export async function recallMemoryStep(state: PipelineState): Promise<PipelineState> {
  const memories = memoryProvider.recall({
    conversationId: state.toolExecutionContext.conversationId,
    contactId: state.toolExecutionContext.contactId,
  });
  return { ...state, memories };
}
