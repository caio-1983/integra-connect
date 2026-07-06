import type { PipelineState } from '../../types/index.js';

export async function buildResponseStep(state: PipelineState): Promise<PipelineState> {
  if (!state.modelResponse || !state.intent || !state.sentiment || !state.handoff) {
    throw new Error('[runtime] Pipeline state incompleto antes de buildResponseStep.');
  }

  return {
    ...state,
    response: {
      content: state.modelResponse.content,
      intent: state.intent,
      sentiment: state.sentiment,
      confidence: state.intent.confidence,
      handoff: state.handoff,
      toolsUsed: state.toolsUsed ?? [],
    },
  };
}
