import type { MemoryKind, MemoryProvider, MemoryRecord, MemoryScope } from '../types/index.js';

/** Base class every memory implementation extends — mirrors BaseAIProvider's role. */
export abstract class BaseMemoryProvider implements MemoryProvider {
  abstract remember(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord;
  abstract recall(scope: MemoryScope, kind?: MemoryKind): MemoryRecord[];
  abstract forget(id: string): void;
}
