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

interface CreateTeamAccountBody {
  email: string;
  full_name: string;
  member_role: 'admin' | 'manager' | 'agent';
  team_id?: string | null;
  function_id?: string | null;
  weight?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Managers can create agent/manager accounts; only admins can create other admins.
  const callerCheck = await requireRole(req, corsHeaders, ['admin', 'manager']);
  if (callerCheck instanceof Response) return callerCheck;

  try {
    const body = (await req.json()) as CreateTeamAccountBody;
    const { email, full_name, member_role, team_id, function_id, weight } = body;

    if (!email || !full_name || !member_role) {
      return new Response(
        JSON.stringify({ error: 'email, full_name e member_role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerCheck.role === 'manager' && member_role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Gestores não podem criar contas de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const temporaryPassword = generateTemporaryPassword();

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !created?.user) {
      const isDuplicate = createError?.message?.toLowerCase().includes('already') ?? false;
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? 'Já existe uma conta com este email'
            : (createError?.message ?? 'Erro ao criar conta'),
        }),
        { status: isDuplicate ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = created.user.id;

    // Trigger `handle_new_user` already created profiles/user_roles rows by now.
    await serviceClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('user_id', newUserId);

    // The team_members upsert below sets the real requested role; a DB
    // trigger (team_members_sync_role) propagates it into user_roles, which
    // is what has_role()/RLS actually enforce.
    const { data: teamMember, error: teamMemberError } = await serviceClient
      .from('team_members')
      .upsert(
        {
          email,
          name: full_name,
          role: member_role,
          status: 'active',
          team_id: team_id || null,
          function_id: function_id || null,
          weight: weight || 1,
          user_id: newUserId,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (teamMemberError) {
      console.error('[create-team-account] Error upserting team_members:', teamMemberError);
    }

    return new Response(
      JSON.stringify({ success: true, temporaryPassword, teamMember: teamMember ?? null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-team-account] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
