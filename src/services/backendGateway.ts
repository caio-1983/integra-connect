/**
 * Shared client for the Integra Connect backend gateway (Sprint 010/011/012):
 * a single Fastify server that fronts BOTH the WhatsApp/Evolution admin surface
 * and the AI Runtime.
 *
 * `VITE_BACKEND_URL` / `VITE_BACKEND_KEY` describe the frontend→backend
 * connection only — the base URL and the HTTP Bearer auth key
 * (`GATEWAY_API_KEY` on the backend). They are NOT the OpenAI/AI provider
 * config, which lives exclusively in the backend's own env. This is why the
 * WhatsApp module can (and must) reach the backend without any AI configuration.
 *
 * The legacy `VITE_AI_GATEWAY_URL` / `VITE_AI_GATEWAY_KEY` names are still
 * honored as a fallback so existing builds keep working; new deployments should
 * prefer the neutral `VITE_BACKEND_*` names. `||` (not `??`) is used on purpose
 * so an empty-string build arg also falls back to the legacy value.
 */
export function backendBaseUrl(): string {
  const url =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    (import.meta.env.VITE_AI_GATEWAY_URL as string | undefined);
  if (!url) throw new Error('VITE_BACKEND_URL não configurado.');
  return url;
}

export function backendAuthKey(): string {
  const key =
    (import.meta.env.VITE_BACKEND_KEY as string | undefined) ||
    (import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined);
  if (!key) throw new Error('VITE_BACKEND_KEY não configurado.');
  return key;
}

export function backendHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${backendAuthKey()}` };
}

// For bodyless requests (DELETE / POST with no payload) — Fastify rejects an
// explicit `Content-Type: application/json` with an empty body
// (FST_ERR_CTP_EMPTY_JSON_BODY), so these calls must omit it.
export function backendAuthOnlyHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${backendAuthKey()}` };
}

export async function handleBackendResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}
