import type { AITool, ToolResult } from '@/ai/types';
import { MOCK_PEOPLE, MOCK_DEALS, MOCK_COMPANIES } from '@/constants';

export const crmTool: AITool = {
  id: 'crm_lookup',
  name: 'Consultar CRM',
  description: 'Busca dados de pessoa, empresa e negócios associados a um contato (mock).',
  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const contactId = String(input.contactId ?? '');
    const person = MOCK_PEOPLE.find((p) => p.id === contactId);
    const deals = MOCK_DEALS.filter((d) => d.contactId === contactId);
    const company = person?.companyId ? MOCK_COMPANIES.find((c) => c.id === person.companyId) : undefined;

    return {
      success: !!person,
      data: { person, company, deals },
      summary: person
        ? `Contato encontrado: ${person.name}${company ? ` (${company.razaoSocial})` : ''}, ${deals.length} negócio(s).`
        : 'Nenhum contato encontrado para este id.',
    };
  },
};
