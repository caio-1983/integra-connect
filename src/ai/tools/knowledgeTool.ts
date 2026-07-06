import type { AITool, ToolResult } from '@/ai/types';
import { getKnowledgeProvider } from '@/ai/services/knowledgeService';

export const knowledgeTool: AITool = {
  id: 'knowledge_search',
  name: 'Buscar na Base de Conhecimento',
  description: 'Busca artigos relevantes na base de conhecimento (mock, sem busca vetorial).',
  async execute(input: Record<string, unknown>): Promise<ToolResult> {
    const query = String(input.query ?? '');
    const results = getKnowledgeProvider().search(query);

    return {
      success: results.length > 0,
      data: { results },
      summary: results.length > 0
        ? `${results.length} artigo(s) encontrado(s) na base de conhecimento.`
        : 'Nenhum artigo encontrado para esta busca.',
    };
  },
};
