import type { PipelineState } from '../../types/index.js';
import { AI_MIDDLEWARE_CHAIN, runMiddlewareChain } from '../../middleware/ai/chain.js';
import { runToolLoop } from '../ToolLoop.js';

async function core(state: PipelineState): Promise<PipelineState> {
  if (!state.promptRequest) {
    throw new Error('[runtime] promptRequest ausente antes de runModelStep.');
  }
  const { response, toolsUsed } = await runToolLoop(
    state.agent.id,
    state.promptRequest,
    state.toolExecutionContext,
    state.executionContext,
  );
  return { ...state, modelResponse: response, toolsUsed };
}

/** The model call is wrapped by the AI middleware chain (guardrails/moderation/context-limit/tool-permission). */
export async function runModelStep(state: PipelineState): Promise<PipelineState> {
  return runMiddlewareChain(AI_MIDDLEWARE_CHAIN, state, core);
}
