import type { MemoryRecord, MemoryScope, MemoryKind } from '@/ai/types';
import { BaseMemoryProvider } from './BaseMemoryProvider';

const STORAGE_KEY = 'ic_ai_memory_v1';

function readAll(): MemoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: MemoryRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage unavailable — mock persistence is best-effort.
  }
}

function matchesScope(record: MemoryScope, scope: MemoryScope): boolean {
  return (
    (scope.conversationId === undefined || record.conversationId === scope.conversationId) &&
    (scope.personId === undefined || record.personId === scope.personId) &&
    (scope.companyId === undefined || record.companyId === scope.companyId)
  );
}

/** The only memory implementation this sprint — localStorage-backed, mirrors channel-service.ts. */
class LocalMemoryProvider extends BaseMemoryProvider {
  remember(record: Omit<MemoryRecord, 'id' | 'createdAt'>): MemoryRecord {
    const all = readAll();
    const stored: MemoryRecord = {
      ...record,
      id: `mem-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    all.push(stored);
    writeAll(all);
    return stored;
  }

  recall(scope: MemoryScope, kind?: MemoryKind): MemoryRecord[] {
    return readAll().filter((r) => matchesScope(r.scope, scope) && (!kind || r.kind === kind));
  }

  forget(id: string): void {
    writeAll(readAll().filter((r) => r.id !== id));
  }
}

export function createLocalMemoryProvider(): LocalMemoryProvider {
  return new LocalMemoryProvider();
}
