import { getSupabase } from './supabaseClient.js';

export type SmartPixKeyType = 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';

/** The data a Smart Pix link shows — and the only fields the public API returns. */
export interface SmartPixData {
  merchantName: string;
  document: string;
  keyType: SmartPixKeyType;
  pixKey: string;
}

export interface SmartPixRecord extends SmartPixData {
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewSmartPixToken extends SmartPixData {
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Works on token hashes only: the raw token never reaches this layer. */
export interface SmartPixRepository {
  insert(row: NewSmartPixToken): Promise<void>;
  findByHash(tokenHash: string): Promise<SmartPixRecord | null>;
  /** Sets revoked_at once; true when a not-yet-revoked row was revoked now. */
  revokeByHash(tokenHash: string, revokedAt: Date): Promise<boolean>;
}

/** pix_smart_tokens through the service-role client (the table has no RLS policies). */
export const supabaseSmartPixRepository: SmartPixRepository = {
  async insert(row) {
    const { error } = await getSupabase().from('pix_smart_tokens').insert({
      token_hash: row.tokenHash,
      merchant_name: row.merchantName,
      document: row.document,
      key_type: row.keyType,
      pix_key: row.pixKey,
      created_at: row.createdAt.toISOString(),
      expires_at: row.expiresAt.toISOString(),
    });
    if (error) throw new Error(`[smart-pix] failed to store token: ${error.message}`);
  },

  async findByHash(tokenHash) {
    const { data, error } = await getSupabase()
      .from('pix_smart_tokens')
      .select('merchant_name, document, key_type, pix_key, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw new Error(`[smart-pix] failed to read token: ${error.message}`);
    if (!data) return null;
    return {
      merchantName: data.merchant_name,
      document: data.document,
      keyType: data.key_type as SmartPixKeyType,
      pixKey: data.pix_key,
      expiresAt: new Date(data.expires_at),
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
    };
  },

  async revokeByHash(tokenHash, revokedAt) {
    const { data, error } = await getSupabase()
      .from('pix_smart_tokens')
      .update({ revoked_at: revokedAt.toISOString() })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .select('token_hash');
    if (error) throw new Error(`[smart-pix] failed to revoke token: ${error.message}`);
    return (data?.length ?? 0) > 0;
  },
};
