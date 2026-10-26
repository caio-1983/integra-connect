/**
 * The message an HTTP client may see for a failure. Only a plain `Error`
 * written for the attendant passes through (e.g. "Só é possível editar as suas
 * próprias mensagens."); anything else gets `fallback`, because it can carry
 * internals: subclasses (Evolution/OpenAI/Supabase errors with upstream
 * bodies, URLs, even key fragments), runtime errors (TypeError: fetch failed)
 * and the backend's own `[repo]`/`[evolution]`/`[meta]`-tagged diagnostics.
 * The full error is always logged by the caller.
 */
export function clientErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || error.constructor !== Error) return fallback;
  if (!error.message || error.message.startsWith('[')) return fallback;
  return error.message;
}
