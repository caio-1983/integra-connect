import { randomUUID } from 'node:crypto';
import type { MemoryKind, MemoryRecord, MemoryScope } from '../types/index.js';
import { BaseMemoryProvider } from './BaseMemoryProvider.js';

function matchesScope(record: MemoryRecord, scope: MemoryScope): boolean {
  if (scope.conversationId && record.scope.conversationId !== scope.conversationId) return false;
  if (scope.contactId && record.scope.contactId !== scope.contactId) return false;
  if (scope.companyId && record.scope.companyId !== scope.companyId) return false;
  return true;
}

/**
 * In-process Map, not persisted across restarts — real cross-restart
 * persistence is Entrega 6 (deferred). Reused conceptually from the
 * frontend's `LocalMemoryProvider` (localStorage there, process memory here).
 */
class InMemoryMemoryProvider extends BaseMemoryProvider {
  private records: MemoryRecord[] = [];

  remember(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord {
    const full: MemoryRecord = { ...record, id: randomUUID(), createdAt: new Date().toISOString() };
    this.records.push(full);
    return full;
  }

  recall(scope: MemoryScope, kind?: MemoryKind): MemoryRecord[] {
    return this.records.filter((r) => matchesScope(r, scope) && (!kind || r.kind === kind));
  }

  forget(id: string): void {
    this.records = this.records.filter((r) => r.id !== id);
  }
}

export const memoryProvider = new InMemoryMemoryProvider();
