/**
 * supabase-js wraps any non-2xx Edge Function response in a generic
 * `FunctionsHttpError` ("Edge Function returned a non-2xx status code") —
 * the function's own `{ error: '...' }` body (the actually useful message)
 * sits unread on `error.context` (the raw Response). Without this, every
 * `functions.invoke` catch block shows the same unhelpful generic string
 * no matter what actually went wrong.
 */
export async function extractEdgeFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : fallback;
}
