import { getSupabase } from './supabaseClient.js';

/** The three roles the app knows (RBAC). `app_role` stores the agent as 'user'. */
export type AppRole = 'admin' | 'manager' | 'agent';

export interface VerifiedToken {
  userId: string;
  /** JWT `exp` (seconds since epoch), when present — bounds how long it may be cached. */
  exp?: number;
}

/** Supabase Auth could not be reached — not the same as "this token is bad". */
export class AuthUnavailableError extends Error {}

/** Which WhatsApp numbers a user can see, in the shape `canAccessInstance` needs. */
export interface InstanceVisibility {
  /** instance_name → owner, for numbers in whatsapp_private_instances. */
  privateOwners: Map<string, string>;
  /** instance_names granted to this user in whatsapp_instance_access. */
  granted: Set<string>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function expOf(token: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Everything the HTTP layer needs to know about WHO is calling and WHAT they
 * may touch: token verification, role, disabled accounts, per-conversation and
 * per-number access. Kept in persistence/ because it is service-role Supabase
 * access like the other repositories; the decisions themselves mirror the SQL
 * (`can_access_conversation`) instead of re-deriving them.
 */
export const accessRepository = {
  /**
   * Verifies a Supabase session access token by asking Supabase Auth for its
   * user. Returns null for a token Auth rejects (expired, forged, signed out);
   * throws AuthUnavailableError when Auth itself failed, so a Supabase outage
   * answers 503 instead of logging everyone out.
   */
  async verifyAccessToken(token: string): Promise<VerifiedToken | null> {
    const { data, error } = await getSupabase().auth.getUser(token);
    if (error) {
      const status = (error as { status?: number }).status ?? 0;
      if (status >= 400 && status < 500) return null;
      throw new AuthUnavailableError(`[auth] getUser failed: ${error.message}`);
    }
    if (!data.user) return null;
    return { userId: data.user.id, exp: expOf(token) };
  },

  /** Highest role the user holds. No row at all means a plain agent, the least privilege. */
  async getRole(userId: string): Promise<AppRole> {
    const { data, error } = await getSupabase().from('user_roles').select('role').eq('user_id', userId);
    if (error) throw new AuthUnavailableError(`[auth] failed to read user_roles: ${error.message}`);
    const roles = new Set((data ?? []).map((row) => row.role as string));
    if (roles.has('admin')) return 'admin';
    if (roles.has('manager')) return 'manager';
    return 'agent';
  },

  /** True when the team screen disabled this person. No team_members row is not "disabled". */
  async isDisabled(userId: string): Promise<boolean> {
    const { data, error } = await getSupabase().from('team_members').select('status').eq('user_id', userId);
    if (error) throw new AuthUnavailableError(`[auth] failed to read team_members: ${error.message}`);
    return (data ?? []).some((row) => row.status === 'disabled');
  },

  /**
   * The same rule RLS applies to conversations: private numbers only for their
   * owner, admins everything else, everyone else only granted numbers (and
   * legacy rows without an instance). False for a conversation that does not exist.
   */
  async canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    if (!isUuid(conversationId)) return false;
    const { data, error } = await getSupabase().rpc('can_access_conversation', {
      _conversation_id: conversationId,
      _user_id: userId,
    });
    if (error) throw new Error(`[access] can_access_conversation failed: ${error.message}`);
    return data === true;
  },

  /** message id → its conversation id, for routes keyed by message (projects). */
  async getMessageConversations(messageIds: string[]): Promise<Map<string, string>> {
    const ids = messageIds.filter(isUuid);
    if (ids.length === 0) return new Map();
    const { data, error } = await getSupabase().from('messages').select('id, conversation_id').in('id', ids);
    if (error) throw new Error(`[access] failed to read message conversations: ${error.message}`);
    return new Map((data ?? []).map((row) => [row.id as string, row.conversation_id as string]));
  },

  async getInstanceVisibility(userId: string): Promise<InstanceVisibility> {
    const supabase = getSupabase();
    const [privates, grants] = await Promise.all([
      supabase.from('whatsapp_private_instances').select('instance_name, owner_user_id'),
      supabase.from('whatsapp_instance_access').select('instance_name').eq('user_id', userId),
    ]);
    if (privates.error) throw new Error(`[access] failed to read private instances: ${privates.error.message}`);
    if (grants.error) throw new Error(`[access] failed to read instance grants: ${grants.error.message}`);
    return {
      privateOwners: new Map((privates.data ?? []).map((row) => [row.instance_name as string, row.owner_user_id as string])),
      granted: new Set((grants.data ?? []).map((row) => row.instance_name as string)),
    };
  },

  /** Grants a user a number — used so a manager who creates one can still see it. Idempotent. */
  async grantInstanceAccess(instanceName: string, userId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('whatsapp_instance_access')
      .upsert({ instance_name: instanceName, user_id: userId, granted_by: userId }, { onConflict: 'instance_name,user_id', ignoreDuplicates: true });
    if (error) throw new Error(`[access] failed to grant instance access: ${error.message}`);
  },
};
