import type { AITool, ToolExecutionContext, ToolResult } from '../types/index.js';

export const workflowTool: AITool = {
  id: 'workflow_trigger',
  name: 'Executar Workflow',
  description: 'Aciona um fluxo de automação interno (mock — nenhuma automação real é executada nesta sprint).',
  parameters: {
    type: 'object',
    properties: {
      workflowName: { type: 'string', description: 'Nome do workflow a acionar.' },
    },
    required: ['workflowName'],
  },
  async execute(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
    const workflowName = String(input.workflowName ?? 'desconhecido');
    return {
      success: true,
      data: { workflowName, conversationId: ctx.conversationId, acknowledged: true },
      summary: `Workflow "${workflowName}" acionado (mock).`,
    };
  },
};
