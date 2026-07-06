import type { PipelineState } from '../../types/index.js';
import type { AIMiddleware } from './AIMiddleware.js';
import { guardrailsMiddleware } from './GuardrailsMiddleware.js';
import { moderationMiddleware } from './ModerationMiddleware.js';
import { contextLimitMiddleware } from './ContextLimitMiddleware.js';
import { toolPermissionMiddleware } from './ToolPermissionMiddleware.js';

/** Order matters: guardrails/moderation gate the request before it's allowed to spend a context-limit or tool-permission check. */
export const AI_MIDDLEWARE_CHAIN: AIMiddleware[] = [
  guardrailsMiddleware,
  moderationMiddleware,
  contextLimitMiddleware,
  toolPermissionMiddleware,
];

export async function runMiddlewareChain(
  chain: AIMiddleware[],
  state: PipelineState,
  core: (state: PipelineState) => Promise<PipelineState>,
): Promise<PipelineState> {
  const dispatch = (index: number, currentState: PipelineState): Promise<PipelineState> => {
    if (index >= chain.length) return core(currentState);
    const middleware = chain[index];
    return middleware.apply(currentState, () => dispatch(index + 1, currentState));
  };
  return dispatch(0, state);
}
