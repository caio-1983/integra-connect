import type { MockCompany, MockDeal, MockPerson } from '../types/index.js';

/**
 * Deliberately duplicated subset of the frontend's `src/lib/mockData.ts`
 * (MOCK_PEOPLE/MOCK_COMPANIES/MOCK_DEALS), just enough to cover the two demo
 * conversations (João Silva / ct1, Maria Oliveira / ct2). Temporary — see
 * `types/crm.ts` for why this duplication exists and when to remove it.
 */
export const MOCK_PEOPLE: MockPerson[] = [
  { id: 'ct1', name: 'João Silva', companyId: 'comp1', email: 'joao.silva@contabilidade.com.br', phone: '+55 11 98432-1567' },
  { id: 'ct2', name: 'Maria Oliveira', companyId: 'comp2', email: 'maria@oliveiracorp.com.br', phone: '+55 11 97654-3210' },
];

export const MOCK_COMPANIES: MockCompany[] = [
  { id: 'comp1', razaoSocial: 'João Silva Contabilidade ME' },
  { id: 'comp2', razaoSocial: 'Oliveira Corp Ltda' },
];

export const MOCK_DEALS: MockDeal[] = [
  { id: 'dl1', contactId: 'ct1', title: 'Automação de Atendimento', value: 4764, stage: 'qualification' },
];
