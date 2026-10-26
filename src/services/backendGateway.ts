import { supabase } from '@/integrations/supabase/client';

/**
 * Shared client for the Integra Connect backend gateway (Sprint 010/011/012):
 * a single Fastify server that fronts BOTH the WhatsApp/Evolution admin surface
 * and the AI Runtime.
 *
 * `VITE_BACKEND_URL` is the frontend→backend base URL only. It is NOT the
 * OpenAI/AI provider config, which lives exclusively in the backend's own env —
 * which is why the WhatsApp module can (and must) reach the backend without any
 * AI configuration. The legacy `VITE_AI_GATEWAY_URL` is still honored as a
 * fallback; `||` (not `??`) so an empty-string build arg also falls back.
 *
 * Auth is the signed-in user's Supabase session: every request carries
 * `Authorization: Bearer <access_token>`, and the backend verifies it and reads
 * the role and per-number access itself. There is no shared key in the bundle
 * anymore (the old VITE_BACKEND_KEY / VITE_AI_GATEWAY_KEY were public to anyone
 * who opened the app, and authenticated anyone).
 */
export function backendBaseUrl(): string {
  const url =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    (import.meta.env.VITE_AI_GATEWAY_URL as string | undefined);
  if (!url) throw new Error('VITE_BACKEND_URL não configurado.');
  return url;
}

/** Refresh this long before expiry, so a token never expires in flight. */
const REFRESH_MARGIN_S = 60;

/**
 * The current session's access token. supabase-js already refreshes in the
 * background, but a tab that slept (laptop lid, throttled timers) can wake up
 * holding an expired token, so it is refreshed here when about to expire.
 */
export async function backendAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  if (session?.expires_at && session.expires_at - REFRESH_MARGIN_S <= Date.now() / 1000) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session ?? session;
  }
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
  return session.access_token;
}

export async function backendHeaders(): Promise<Record<string, string>> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${await backendAccessToken()}` };
}

// For bodyless requests (DELETE / POST with no payload) — Fastify rejects an
// explicit `Content-Type: application/json` with an empty body
// (FST_ERR_CTP_EMPTY_JSON_BODY), so these calls must omit it.
export async function backendAuthOnlyHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await backendAccessToken()}` };
}

export async function handleBackendResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
