import type { PipelineState } from '../../types/index.js';

/** Onion-style middleware (like Koa) wrapping the model/tool-loop call inside `runModelStep`. */
export interface AIMiddleware {
  readonly name: string;
  apply(state: PipelineState, next: () => Promise<PipelineState>): Promise<PipelineState>;
}
