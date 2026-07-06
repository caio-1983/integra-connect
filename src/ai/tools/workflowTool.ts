import type { AITool, ToolResult } from '@/ai/types';

/** Prep for a future automation engine — just acknowledges the trigger this sprint. */
export const workflowTool: AITool = {
  id: 'workflow_trigger',
  name: 'Acionar Automação',
  description: 'Aciona um fluxo de automação (mock, sem execução real).',
  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const workflowName = String(input.workflowName ?? 'fluxo genérico');
    return {
      success: true,
      data: { workflowName, status: 'acknowledged' },
      summary: `Automação "${workflowName}" registrada (mock — nenhuma execução real ocorreu).`,
    };
  },
};
