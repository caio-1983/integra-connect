/**
 * Memory contract — agents never touch a memory implementation directly,
 * only this interface (via `src/ai/services/ContextBuilder.ts`, which reads,
 * and the agents/services that write). `LocalMemoryProvider` is the only
 * implementation this sprint (localStorage-backed); a future real backend
 * swaps the implementation without changing this contract.
 */
export type MemoryKind = 'short_term' | 'long_term' | 'customer' | 'company';

export interface MemoryScope {
  conversationId?: string;
  personId?: string;
  companyId?: string;
}

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MemoryProvider {
  remember(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord;
  recall(scope: MemoryScope, kind?: MemoryKind): MemoryRecord[];
  forget(id: string): void;
}
