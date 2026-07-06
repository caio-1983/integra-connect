/**
 * Memory contract — the pipeline's `recallMemoryStep`/`postProcessingStep`
 * are the only callers, never a tool or agent directly. `InMemoryMemoryProvider`
 * is the only implementation this sprint (process memory, not persisted across
 * restarts — real persistence is Entrega 6, deferred); a future implementation
 * swaps in without changing this contract.
 */
export type MemoryKind = 'short_term' | 'long_term' | 'customer' | 'company';

export interface MemoryScope {
  conversationId?: string;
  contactId?: string;
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
