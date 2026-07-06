import type { AITool } from '@/ai/types';
import { crmTool } from './crmTool';
import { schedulingTool } from './schedulingTool';
import { financeTool } from './financeTool';
import { knowledgeTool } from './knowledgeTool';
import { workflowTool } from './workflowTool';

export const TOOL_REGISTRY: Record<string, AITool> = {
  [crmTool.id]: crmTool,
  [schedulingTool.id]: schedulingTool,
  [financeTool.id]: financeTool,
  [knowledgeTool.id]: knowledgeTool,
  [workflowTool.id]: workflowTool,
};

export function getTool(id: string): AITool | undefined {
  return TOOL_REGISTRY[id];
}

export function getToolsByIds(ids: string[]): AITool[] {
  return ids.map((id) => TOOL_REGISTRY[id]).filter((t): t is AITool => !!t);
}
