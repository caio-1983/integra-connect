export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AITool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  execute(input: Record<string, unknown>): Promise<ToolResult>;
}
