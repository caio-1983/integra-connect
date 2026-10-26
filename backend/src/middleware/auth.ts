import type { FastifyReply, FastifyRequest } from 'fastify';
import { configService } from '../config/ConfigService.js';
import { accessRepository, AuthUnavailableError, type AppRole } from '../persistence/AccessRepository.js';
import { sha256 } from '../utils/secrets.js';

/** The person behind a request, as verified from their Supabase session. */
export interface AuthUser {
  id: string;
  role: AppRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by authMiddleware; every route behind it can rely on it. */
    authUser?: AuthUser;
  }
}

/**
 * Verified tokens, keyed by the token's SHA-256 (the token itself is never
 * kept). Supabase Auth is asked once per token per TTL instead of once per
 * request; the price is that a signed-out or disabled user keeps working for
 * up to AUTH_CACHE_TTL_MS. Rejections are not cached, so a token that becomes
 * valid (clock skew) is not stuck.
 */
const AUTH_CACHE_TTL_MS = configService.getNumber('AUTH_CACHE_TTL_MS', 60_000);
const AUTH_CACHE_MAX = 5_000;
const authCache = new Map<string, { user: AuthUser; expiresAt: number }>();

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7).trim();
  // Only JWT-shaped values go on to Supabase Auth: the old static key, or junk,
  // is refused here without costing a network round trip.
  return JWT_SHAPE.test(token) ? token : undefined;
}

function cacheKey(token: string): string {
  return sha256(token).toString('hex');
}

function cached(token: string): AuthUser | undefined {
  const key = cacheKey(token);
  const hit = authCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    authCache.delete(key);
    return undefined;
  }
  return hit.user;
}

function remember(token: string, user: AuthUser, exp?: number): void {
  const now = Date.now();
  // Never past the token's own expiry.
  const expiresAt = Math.min(now + AUTH_CACHE_TTL_MS, exp ? exp * 1000 : Infinity);
  if (expiresAt <= now) return;
  if (authCache.size >= AUTH_CACHE_MAX) {
    for (const [key, entry] of authCache) if (entry.expiresAt <= now) authCache.delete(key);
    // Still full of live entries: drop the oldest rather than grow without bound.
    if (authCache.size >= AUTH_CACHE_MAX) authCache.delete(authCache.keys().next().value as string);
  }
  authCache.set(cacheKey(token), { user, expiresAt });
}

/**
 * The user id behind the request IF its token was already verified — for the
 * rate limiter, which runs before authMiddleware. An unverified or unknown token
 * yields undefined (the caller falls back to the IP), so a forged token can
 * never pick its own rate-limit bucket.
 */
export function verifiedUserIdOf(request: FastifyRequest): string | undefined {
  const token = bearerToken(request);
  return token ? cached(token)?.id : undefined;
}

/**
 * HTTP auth between the Integra Connect frontend and this backend: the
 * caller's Supabase session access token (`Authorization: Bearer <jwt>`),
 * verified against Supabase Auth, then the role read from `user_roles`.
 * Replaces the old shared GATEWAY_API_KEY, which shipped in the public bundle
 * and so authenticated anyone. A person disabled on the team screen is refused.
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = bearerToken(request);
  if (!token) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }

  const hit = cached(token);
  if (hit) {
    request.authUser = hit;
    return;
  }

  try {
    const verified = await accessRepository.verifyAccessToken(token);
    if (!verified) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    const [role, disabled] = await Promise.all([
      accessRepository.getRole(verified.userId),
      accessRepository.isDisabled(verified.userId),
    ]);
    if (disabled) {
      reply.code(403).send({ error: 'Usuário desativado.' });
      return;
    }
    const user: AuthUser = { id: verified.userId, role };
    remember(token, user, verified.exp);
    request.authUser = user;
  } catch (error) {
    request.log.error(error, '[auth] could not verify the session');
    const status = error instanceof AuthUnavailableError ? 503 : 500;
    reply.code(status).send({ error: 'Não foi possível validar a sessão agora.' });
  }
}

/** The authenticated user; only call from a handler behind authMiddleware. */
export function authUserOf(request: FastifyRequest): AuthUser {
  if (!request.authUser) throw new Error('[auth] route is missing authMiddleware');
  return request.authUser;
}

/** preHandler: authMiddleware must run first; refuses anyone outside `roles`. */
export function requireRole(...roles: AppRole[]) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.authUser || !roles.includes(request.authUser.role)) {
      reply.code(403).send({ error: 'Sem permissão para esta ação.' });
    }
  };
}

/** Shared by every route behind authMiddleware — the Swagger "Authorize" scheme. */
export const BEARER_SECURITY = [{ bearerAuth: [] }];
