import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireRole } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

function generateTemporaryPassword(length = 14): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Managers can reset passwords for agent/manager accounts; only admins can
  // reset another admin's password.
  const callerCheck = await requireRole(req, corsHeaders, ['admin', 'manager']);
  if (callerCheck instanceof Response) return callerCheck;

  try {
    const { user_id } = (await req.json()) as { user_id?: string };

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Only accounts that belong to the visible team can be reset from the app;
    // this keeps arbitrary auth users and the hidden maintenance account out.
    const { data: targetMember } = await serviceClient
      .from('team_members')
      .select('role, hidden')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!targetMember || targetMember.hidden) {
      return new Response(
        JSON.stringify({ error: 'Conta não encontrada na equipe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerCheck.role === 'manager') {
      const { data: targetAdminRoles } = await serviceClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .eq('role', 'admin');

      if (targetMember.role === 'admin' || (targetAdminRoles?.length ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: 'Gestores não podem redefinir a senha de um administrador' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const temporaryPassword = generateTemporaryPassword();

    const { error: updateError } = await serviceClient.auth.admin.updateUserById(user_id, {
      password: temporaryPassword,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await serviceClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', user_id);

    return new Response(
      JSON.stringify({ success: true, temporaryPassword }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[reset-team-account-password] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
