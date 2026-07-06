import type { AITool, ToolExecutionContext, ToolResult } from '../types/index.js';
import { knowledgeEngine } from '../knowledge/KnowledgeEngine.js';

export const knowledgeTool: AITool = {
  id: 'knowledge_search',
  name: 'Consultar Base de Conhecimento',
  description: 'Busca artigos da base de conhecimento relevantes para uma pergunta.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Pergunta ou termo de busca.' },
    },
    required: ['query'],
  },
  async execute(input: Record<string, unknown>, _ctx: ToolExecutionContext): Promise<ToolResult> {
    const query = String(input.query ?? '');
    const hits = knowledgeEngine.search(query);
    return {
      success: hits.length > 0,
      data: { hits: hits.map((h) => ({ title: h.article.title, content: h.article.content, score: h.score })) },
      summary: hits.length > 0
        ? `Artigos encontrados: ${hits.map((h) => h.article.title).join(', ')}.`
        : 'Nenhum artigo relevante encontrado.',
    };
  },
};
