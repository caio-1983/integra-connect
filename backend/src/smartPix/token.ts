import { createHash, randomBytes } from 'node:crypto';

/**
 * Smart Pix link tokens: 16 bytes from the OS CSPRNG — 128 bits, 22 base64url
 * characters. Nothing about the company, the key or the time goes into them.
 * "A recuperação por brute force é impraticável devido à entropia de 128 bits."
 *
 * Only SHA-256(token) is stored; the raw token exists in the generation
 * response and in the link the customer opens, nowhere else.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateSmartPixToken(): string {
  return randomBytes(16).toString('base64url');
}

export function hashSmartPixToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isWellFormedSmartPixToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}
