import type { AITool } from '../types/index.js';
import { crmTool } from './crmTool.js';
import { schedulingTool } from './schedulingTool.js';
import { financeTool } from './financeTool.js';
import { knowledgeTool } from './knowledgeTool.js';
import { workflowTool } from './workflowTool.js';

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
