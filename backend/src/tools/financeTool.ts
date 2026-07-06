import type { AITool, ToolExecutionContext, ToolResult } from '../types/index.js';

export const financeTool: AITool = {
  id: 'finance_check_invoice',
  name: 'Consultar Financeiro',
  description: 'Consulta a situação de faturas/cobranças de um contato (mock).',
  parameters: {
    type: 'object',
    properties: {
      contactId: { type: 'string', description: 'Id do contato a consultar.' },
    },
    required: ['contactId'],
  },
  async execute(input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
    const contactId = String(input.contactId ?? ctx.contactId);
    return {
      success: true,
      data: { contactId, status: 'em dia', nextDueDate: '2026-08-05', amount: 397 },
      summary: 'Faturas em dia. Próximo vencimento em 05/08/2026, valor de R$ 397,00.',
    };
  },
};
