import type { ToolExecutionContext } from './execution.js';

export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
  metadata?: Record<string, unknown>;
}

/** JSON-schema description of a tool's input, sent to the LLM as a function-calling tool. */
export interface AIToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AITool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  execute(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult>;
}
