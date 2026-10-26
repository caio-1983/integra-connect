import { createHash, timingSafeEqual } from 'node:crypto';

export function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/**
 * Constant-time string comparison for shared secrets (webhook path secrets,
 * verify tokens). Hashing first gives both sides the same length, so neither
 * the content nor the length of the expected value leaks through timing.
 */
export function secretsEqual(provided: string | undefined, expected: string): boolean {
  if (provided === undefined) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}
