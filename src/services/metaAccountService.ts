import { backendAuthOnlyHeaders, backendBaseUrl } from '@/services/backendGateway';

/**
 * Configured Meta accounts (Facebook Pages / Instagram professional accounts).
 *
 * There is no pairing flow to drive from the UI — a Meta account is connected by
 * putting its page access token in the backend's `META_PAGE_TOKENS` and pointing
 * Meta's webhook here. So this reads what is configured and returns the exact
 * values to paste into the Meta app.
 */

export interface MetaAccount {
  id: string;
  connected: boolean;
}

export interface MetaAccountsResult {
  accounts: MetaAccount[];
  /** Null when PUBLIC_BASE_URL isn't configured — better than showing a wrong URL. */
  webhookUrl: string | null;
  verifyTokenConfigured: boolean;
  signatureCheckEnabled: boolean;
  /** The backend didn't answer — nothing above is known, so the UI must not
   *  present it as "not configured". */
  unreachable?: boolean;
}

const EMPTY: MetaAccountsResult = {
  accounts: [],
  webhookUrl: null,
  verifyTokenConfigured: false,
  signatureCheckEnabled: false,
};

export async function fetchMetaAccounts(): Promise<MetaAccountsResult> {
  // The channels page must render even with no backend configured (mock-only
  // harness, or a deploy where the gateway URL isn't set yet) — backendBaseUrl()
  // throws in that case, so it lives inside the try.
  try {
    const base = backendBaseUrl();
    const response = await fetch(`${base}/v1/meta/accounts`, { headers: backendAuthOnlyHeaders() });
    if (!response.ok) return { ...EMPTY, unreachable: true };
    return (await response.json()) as MetaAccountsResult;
  } catch {
    return { ...EMPTY, unreachable: true };
  }
}
