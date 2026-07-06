import type { PipelineState, PipelineStep } from '../types/index.js';

/**
 * Generic step executor — `AgentRuntime` assembles a step list and hands it
 * here. New steps (guardrails, translation, caching, classification,
 * auditoria...) are added to the array; this function never changes.
 */
export async function runPipeline(steps: PipelineStep[], initialState: PipelineState): Promise<PipelineState> {
  let state = initialState;
  for (const step of steps) {
    state = await step(state);
  }
  return state;
}
