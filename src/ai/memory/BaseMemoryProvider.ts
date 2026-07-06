import type { MemoryProvider, MemoryRecord, MemoryScope, MemoryKind } from '@/ai/types';

/**
 * Base class every memory provider extends. Agents never talk to a concrete
 * memory implementation — only to this contract, via `ContextBuilder`
 * (reads) and the agents/services that call `remember()`. Swapping in a real
 * backend (short-term cache + long-term vector store) later means a new
 * subclass, nothing else changes.
 */
export abstract class BaseMemoryProvider implements MemoryProvider {
  abstract remember(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord;
  abstract recall(scope: MemoryScope, kind?: MemoryKind): MemoryRecord[];
  abstract forget(id: string): void;
}
