import type { AITool, ToolResult } from '@/ai/types';

const MOCK_SLOTS = [
  { date: 'Amanhã', time: '14:00' },
  { date: 'Sexta-feira', time: '10:00' },
  { date: 'Segunda-feira', time: '09:30' },
];

export const schedulingTool: AITool = {
  id: 'scheduling_suggest_slots',
  name: 'Sugerir Horários',
  description: 'Sugere horários disponíveis para agendamento (mock).',
  async execute(): Promise<ToolResult> {
    return {
      success: true,
      data: { slots: MOCK_SLOTS },
      summary: `${MOCK_SLOTS.length} horários disponíveis sugeridos.`,
    };
  },
};
