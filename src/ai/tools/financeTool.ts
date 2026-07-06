import type { AITool, ToolResult } from '@/ai/types';

export const financeTool: AITool = {
  id: 'finance_check_invoice',
  name: 'Consultar Financeiro',
  description: 'Verifica status de fatura/pagamento associado a um contato (mock).',
  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const contactId = String(input.contactId ?? '');
    const mockInvoice = {
      contactId,
      status: 'em_dia' as const,
      lastInvoiceValue: 'R$ 397,00',
      dueDate: '10/07/2026',
    };

    return {
      success: true,
      data: mockInvoice,
      summary: 'Situação financeira: em dia, sem pendências.',
    };
  },
};
