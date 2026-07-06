import type { MemoryProvider } from '@/ai/types';
import { createLocalMemoryProvider } from './LocalMemoryProvider';

export { BaseMemoryProvider } from './BaseMemoryProvider';

let instance: MemoryProvider | null = null;

/** Memoized accessor — only `LocalMemoryProvider` is registered this sprint. */
export function getMemoryProvider(): MemoryProvider {
  if (!instance) instance = createLocalMemoryProvider();
  return instance;
}
