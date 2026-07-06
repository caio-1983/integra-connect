import type { AgentConfig, AIModel, KnowledgeArticle } from '@/ai/types';

/**
 * Seed data for the Sprint 009 IA module. Kept separate from `mockData.ts`
 * since this is a large, distinct domain — imported directly from
 * `@/lib/mockAIData`.
 */

export const MOCK_AI_MODELS: AIModel[] = [
  {
    id: 'local-mock-v1',
    name: 'Local Mock v1',
    provider: 'local',
    supportsTools: true,
    supportsVision: false,
    supportsEmbeddings: true,
    supportsStreaming: false,
    contextWindow: 8000,
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    supportsTools: true,
    supportsVision: true,
    supportsEmbeddings: true,
    supportsStreaming: true,
    contextWindow: 128000,
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'claude',
    supportsTools: true,
    supportsVision: true,
    supportsEmbeddings: false,
    supportsStreaming: true,
    contextWindow: 200000,
  },
  {
    id: 'gemini-2.5',
    name: 'Gemini 2.5',
    provider: 'gemini',
    supportsTools: true,
    supportsVision: true,
    supportsEmbeddings: true,
    supportsStreaming: true,
    contextWindow: 1000000,
  },
  {
    id: 'llama3-ollama',
    name: 'Llama 3 (Ollama)',
    provider: 'ollama',
    supportsTools: false,
    supportsVision: false,
    supportsEmbeddings: true,
    supportsStreaming: true,
    contextWindow: 8000,
  },
];

export const MOCK_AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'atendimento',
    name: 'Nina — Atendimento',
    description: 'Atende o cliente de forma autônoma e assiste o operador como Copilot após o handoff.',
    status: 'active',
    priority: 2,
    modelId: 'local-mock-v1',
    toolIds: ['crm_lookup', 'scheduling_suggest_slots', 'knowledge_search'],
    knowledgeSourceIds: ['faq'],
  },
  {
    id: 'recepcao',
    name: 'Recepção',
    description: 'Triagem inicial de novos contatos antes de rotear para o agente especializado.',
    status: 'draft',
    priority: 1,
    modelId: 'local-mock-v1',
    toolIds: ['crm_lookup'],
    knowledgeSourceIds: ['faq'],
  },
  {
    id: 'comercial',
    name: 'Comercial',
    description: 'Conduz negociações, propostas e fechamento de negócios.',
    status: 'draft',
    priority: 4,
    modelId: 'local-mock-v1',
    toolIds: ['crm_lookup', 'scheduling_suggest_slots'],
    knowledgeSourceIds: ['faq'],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Trata cobranças, faturas e questões financeiras.',
    status: 'draft',
    priority: 5,
    modelId: 'local-mock-v1',
    toolIds: ['finance_check_invoice'],
    knowledgeSourceIds: ['faq'],
  },
  {
    id: 'suporte',
    name: 'Suporte',
    description: 'Resolve dúvidas técnicas e problemas de uso da plataforma.',
    status: 'draft',
    priority: 3,
    modelId: 'local-mock-v1',
    toolIds: ['knowledge_search', 'workflow_trigger'],
    knowledgeSourceIds: ['faq'],
  },
];

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

export const MOCK_PLAYGROUND_PRESETS: string[] = [
  'Quanto custa o plano para 3 atendentes?',
  'Vocês integram com o ContaAzul?',
  'Quero cancelar minha assinatura.',
  'Estou com um problema técnico urgente, preciso falar com um atendente.',
];
