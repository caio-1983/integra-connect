import type { AITool, ToolExecutionContext, ToolResult } from '../types/index.js';

const MOCK_SLOTS = [
  { date: 'amanhã', time: '14:00' },
  { date: 'sexta-feira', time: '10:00' },
  { date: 'sexta-feira', time: '16:30' },
];

export const schedulingTool: AITool = {
  id: 'scheduling_suggest_slots',
  name: 'Consultar Agenda',
  description: 'Sugere horários disponíveis para agendamento (mock).',
  parameters: {
    type: 'object',
    properties: {
      preferredPeriod: { type: 'string', description: 'Período preferido, ex: manhã, tarde.' },
    },
  },
  async execute(_input: Record<string, unknown>, _ctx: ToolExecutionContext): Promise<ToolResult> {
    return {
      success: true,
      data: { slots: MOCK_SLOTS },
      summary: `Horários disponíveis: ${MOCK_SLOTS.map((s) => `${s.date} às ${s.time}`).join(', ')}.`,
    };
  },
};
