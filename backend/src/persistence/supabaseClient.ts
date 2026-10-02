import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { configService } from '../config/ConfigService.js';

/**
 * Service-role Supabase client (bypasses RLS) — server-side only, exactly
 * like the existing Edge Functions (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`).
 * Intentionally the ONLY module that constructs a Supabase client; only the
 * repositories in this folder import it: `ConversationRepository` (Ajuste 1)
 * and `SmartPixRepository` (pix_smart_tokens, which has RLS on and no
 * policies, so only this service-role client can reach it).
 */
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      configService.require('SUPABASE_URL'),
      configService.require('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    );
  }
  return client;
}
