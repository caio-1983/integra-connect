import 'dotenv/config';

/**
 * The single place that reads `process.env`. No provider, route, or service
 * anywhere else in this backend should touch `process.env` directly — that's
 * what lets this swap for Supabase/Vault/Azure Key Vault/AWS Secrets Manager
 * later without touching a single caller.
 */
class ConfigService {
  get(key: string): string | undefined {
    return process.env[key];
  }

  require(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`[config] Missing required environment variable "${key}".`);
    }
    return value;
  }

  getNumber(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}

export const configService = new ConfigService();
