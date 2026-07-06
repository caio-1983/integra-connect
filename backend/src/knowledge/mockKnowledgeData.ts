import type { KnowledgeArticle } from '../types/index.js';

/** Mirrored subset of the frontend's `src/lib/mockAIData.ts` MOCK_KNOWLEDGE_ARTICLES. Temporary — see mockCrmData.ts. */
export const MOCK_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'kb1',
    title: 'Integração com ContaAzul',
    content: 'A Integra Connect possui integração nativa com o ContaAzul. A configuração leva menos de 1 hora e pode ser feita remotamente pelo nosso time de suporte.',
    tags: ['integração', 'contaazul'],
    agentIds: ['atendimento', 'comercial', 'suporte'],
    updatedAt: '2026-06-10T10:00:00.000Z',
  },
  {
    id: 'kb2',
    title: 'Planos e preços',
    content: 'O Plano Profissional custa R$ 397/mês no anual ou R$ 497/mês no mensal, incluindo IA ativa, até 5 atendentes simultâneos, relatórios e CRM integrado.',
    tags: ['preço', 'planos'],
    agentIds: ['atendimento', 'comercial'],
    updatedAt: '2026-06-12T10:00:00.000Z',
  },
  {
    id: 'kb3',
    title: 'Política de cancelamento',
    content: 'O cancelamento pode ser solicitado a qualquer momento, sem multa. Planos anuais têm reembolso proporcional aos meses não utilizados.',
    tags: ['cancelamento', 'política'],
    agentIds: ['atendimento', 'financeiro'],
    updatedAt: '2026-06-08T10:00:00.000Z',
  },
  {
    id: 'kb4',
    title: 'SLA de suporte técnico',
    content: 'Chamados de suporte técnico são respondidos em até 2 horas úteis. Casos críticos têm prioridade e resposta em até 30 minutos.',
    tags: ['suporte', 'sla'],
    agentIds: ['atendimento', 'suporte'],
    updatedAt: '2026-06-05T10:00:00.000Z',
  },
  {
    id: 'kb5',
    title: 'Período de teste gratuito',
    content: 'Oferecemos 14 dias grátis, sem necessidade de cartão de crédito, com acesso a todas as funcionalidades do plano escolhido.',
    tags: ['trial', 'planos'],
    agentIds: ['atendimento', 'comercial'],
    updatedAt: '2026-06-14T10:00:00.000Z',
  },
  {
    id: 'kb6',
    title: 'Faturas e boletos',
    content: 'Faturas são emitidas automaticamente todo dia 5 e enviadas por e-mail. Segunda via de boleto pode ser gerada na área financeira.',
    tags: ['financeiro', 'boleto'],
    agentIds: ['atendimento', 'financeiro'],
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
];
