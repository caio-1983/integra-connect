import { generateSmartPixToken, hashSmartPixToken, isWellFormedSmartPixToken } from './token.js';
import { supabaseSmartPixRepository, type SmartPixData, type SmartPixRepository } from '../persistence/SmartPixRepository.js';

export const DEFAULT_TTL_DAYS = 30;
export const MAX_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Smart Pix links: create one for a set of Pix data, resolve it back, revoke
 * it. Hashes every token before it reaches the repository. The clock is
 * injectable so expiry can be tested; created_at, expires_at and revoked_at all
 * come from it, which keeps the table's date constraints consistent.
 */
export function createSmartPixService(repository: SmartPixRepository, now: () => Date = () => new Date()) {
  return {
    async createToken(data: SmartPixData, ttlDays: number = DEFAULT_TTL_DAYS): Promise<{ token: string; expiresAt: Date }> {
      const token = generateSmartPixToken();
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + ttlDays * DAY_MS);
      await repository.insert({
        tokenHash: hashSmartPixToken(token),
        merchantName: data.merchantName,
        document: data.document,
        keyType: data.keyType,
        pixKey: data.pixKey,
        createdAt,
        expiresAt,
      });
      return { token, expiresAt };
    },

    /** The link's data, or null for any link that must not open — malformed,
     * unknown, revoked or expired alike, so callers can't tell them apart. */
    async resolve(token: unknown): Promise<SmartPixData | null> {
      if (!isWellFormedSmartPixToken(token)) return null;
      const record = await repository.findByHash(hashSmartPixToken(token));
      if (!record || record.revokedAt || record.expiresAt.getTime() <= now().getTime()) return null;
      return {
        merchantName: record.merchantName,
        document: record.document,
        keyType: record.keyType,
        pixKey: record.pixKey,
      };
    },

    /** Expects a well-formed token (the caller validates it). */
    async revoke(token: string): Promise<boolean> {
      return repository.revokeByHash(hashSmartPixToken(token), now());
    },
  };
}

export type SmartPixService = ReturnType<typeof createSmartPixService>;

export const smartPixService = createSmartPixService(supabaseSmartPixRepository);
