import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Require either a valid user JWT or the service role key.
 * Returns null on success, or a Response (401) to short-circuit the request.
 */
export async function requireAuth(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) return null;

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return null;
}

/**
 * Require the service role key (for internal/server-to-server endpoints).
 */
export function requireServiceRole(req: Request, corsHeaders: Record<string, string>): Response | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!token || !serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return null;
}

/**
 * Require a valid user JWT belonging to someone with the 'admin' app_role.
 * Returns the caller's user id on success, or a Response (401/403) to short-circuit the request.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ userId: string } | Response> {
  const result = await requireRole(req, corsHeaders, ['admin']);
  if (result instanceof Response) return result;
  return { userId: result.userId };
}

/**
 * Require a valid user JWT belonging to someone whose app_role is one of
 * `allowedRoles` (e.g. ['admin', 'manager']). Returns the caller's user id
 * and actual role on success, or a Response (401/403) to short-circuit.
 */
export async function requireRole(
  req: Request,
  corsHeaders: Record<string, string>,
  allowedRoles: Array<'admin' | 'manager' | 'agent'>
): Promise<{ userId: string; role: 'admin' | 'manager' | 'agent' } | Response> {
  const unauthorized = () => new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
  const forbidden = () => new Response(JSON.stringify({ error: `Forbidden: role must be one of ${allowedRoles.join(', ')}` }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return unauthorized();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !userData?.user) return unauthorized();

  const { data: roleRow } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .in('role', allowedRoles)
    .maybeSingle();

  if (!roleRow) return forbidden();

  return { userId: userData.user.id, role: roleRow.role };
}