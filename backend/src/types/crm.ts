/**
 * Minimal mock CRM shapes for tool execution. Deliberately duplicated from
 * the frontend's `src/lib/mockData.ts` (Person/Company/Deal) — there is no
 * Supabase table for any of this today (Sprint 007's CRM module has always
 * been frontend-only mock data). Replace with real queries once CRM has an
 * actual database; nothing above `tools/` needs to change when that happens.
 */
export interface MockPerson {
  id: string;
  name: string;
  companyId?: string;
  email?: string;
  phone?: string;
}

export interface MockCompany {
  id: string;
  razaoSocial: string;
}

export interface MockDeal {
  id: string;
  contactId: string;
  title: string;
  value?: number;
  stage?: string;
}
