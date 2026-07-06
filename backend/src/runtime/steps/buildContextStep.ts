import type { PipelineState } from '../../types/index.js';
import { buildCoreContext } from '../../context/ContextBuilder.js';

export async function buildContextStep(state: PipelineState): Promise<PipelineState> {
  const { crm, tools } = await buildCoreContext(state);
  return { ...state, crm, tools };
}
