import type {
  ConnectionStateResult, CreateInstanceParams, EvolutionAdapter, QrResult, RawContact, RawFetchedInstance, RawGroupInfo, SendTextResult,
} from './types.js';
import { v1Adapter } from './V1Adapter.js';
import { v2Adapter } from './V2Adapter.js';
import { logger } from '../../logger/Logger.js';

export class EvolutionApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown, message: string) {
    super(message);
  }
}

function instanceAlreadyExists(error: unknown): boolean {
  if (!(error instanceof EvolutionApiError) || error.status !== 403) return false;
  const messages = (error.body as { response?: { message?: unknown } } | undefined)?.response?.message;
  const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '');
  return text.toLowerCase().includes('already in use');
}

function instanceAlreadyDisconnected(error: unknown): boolean {
  if (!(error instanceof EvolutionApiError) || error.status !== 400) return false;
  const body = error.body as { response?: { message?: unknown }; message?: unknown } | undefined;
  const raw = body?.response?.message ?? body?.message;
  const text = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
  return text.toLowerCase().includes('not connected');
}

/**
 * Thin HTTP client to a running Evolution API. Auto-detects the installed
 * major version once (`GET /` → `version`) and delegates version-specific
 * payload shaping to the matching adapter, so callers never branch on version
 * (the explicit "não assumir rotas nem payloads / adaptar à versão" goal).
 */
export class EvolutionClient {
  private adapter: EvolutionAdapter | undefined;

  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private headers(): Record<string, string> {
    return { 'Content-Type': 'application/json', apikey: this.apiKey };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      throw new EvolutionApiError(res.status, json, `[evolution] ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return json as T;
  }

  /** GET / (no auth required) → detect major version. */
  async detectVersion(): Promise<number> {
    const res = await fetch(this.url('/'));
    const json = (await res.json()) as { version?: string };
    const major = Number(String(json.version ?? '2').split('.')[0]) || 2;
    logger.info({ version: json.version, major }, '[evolution] version detected');
    return major;
  }

  private async getAdapter(): Promise<EvolutionAdapter> {
    if (!this.adapter) {
      const major = await this.detectVersion();
      this.adapter = major === 1 ? v1Adapter : v2Adapter;
    }
    return this.adapter;
  }

  async createInstance(params: CreateInstanceParams): Promise<{ qr: QrResult; major: number }> {
    const adapter = await this.getAdapter();
    let response: unknown;
    try {
      response = await this.request<unknown>('POST', '/instance/create', adapter.createInstanceBody(params));
    } catch (error) {
      if (!instanceAlreadyExists(error)) throw error;
      // Instance was already created in a prior attempt — reconnect to it
      // instead of failing, so retrying with the same name is idempotent.
      logger.info({ instanceName: params.instanceName }, '[evolution] instance already exists — reusing it');
      response = await this.request<unknown>('GET', `/instance/connect/${params.instanceName}`);
    }
    // belt-and-suspenders: also (re)register the webhook explicitly
    await this.setWebhook(params.instanceName, params.webhookUrl, params.events);
    return { qr: adapter.parseQr(response), major: adapter.major };
  }

  /** (Re)registers the webhook URL for an existing instance — used both by
   * createInstance (belt-and-suspenders) and by reconnect, so that changing
   * PUBLIC_BASE_URL (e.g. a new ngrok tunnel) takes effect without having to
   * delete and recreate the instance. */
  async setWebhook(instanceName: string, webhookUrl: string, events: string[]): Promise<void> {
    const adapter = await this.getAdapter();
    await this.request<unknown>('POST', `/webhook/set/${instanceName}`, adapter.setWebhookBody({ url: webhookUrl, events })).catch((e) => {
      logger.warn({ err: String(e), instanceName }, '[evolution] webhook/set failed');
    });
  }

  async connect(instanceName: string): Promise<QrResult> {
    const adapter = await this.getAdapter();
    const response = await this.request<unknown>('GET', `/instance/connect/${instanceName}`);
    return adapter.parseQr(response);
  }

  async connectionState(instanceName: string): Promise<ConnectionStateResult> {
    const response = await this.request<{ instance?: { state?: string } }>('GET', `/instance/connectionState/${instanceName}`);
    const state = response?.instance?.state;
    if (state === 'open' || state === 'connecting' || state === 'close') return { state };
    return { state: 'unknown' };
  }

  async sendText(instanceName: string, number: string, text: string): Promise<SendTextResult> {
    const adapter = await this.getAdapter();
    const response = await this.request<unknown>('POST', `/message/sendText/${instanceName}`, adapter.sendTextBody({ number, text }));
    return adapter.parseSendResult(response);
  }

  /** GET /instance/fetchInstances — identical shape on v1 and v2 (verified against the official OpenAPI specs). */
  async fetchInstances(): Promise<RawFetchedInstance[]> {
    return this.request<RawFetchedInstance[]>('GET', '/instance/fetchInstances');
  }

  /** DELETE /instance/logout/{instance} — disconnects the session, keeps the instance registered. */
  async logout(instanceName: string): Promise<void> {
    try {
      await this.request<unknown>('DELETE', `/instance/logout/${instanceName}`);
    } catch (error) {
      if (!instanceAlreadyDisconnected(error)) throw error;
      logger.info({ instanceName }, '[evolution] instance already disconnected — treating logout as a no-op');
    }
  }

  /** DELETE /instance/delete/{instance} — Evolution logs out internally first if still connected. */
  async deleteInstance(instanceName: string): Promise<void> {
    await this.request<unknown>('DELETE', `/instance/delete/${instanceName}`);
  }

  /** GET /group/findGroupInfos/{instance}?groupJid=... — v2 only. Throws on
   * failure (unlike fetchGroupSubject below) — this is for the user-triggered
   * "ver participantes" flow, where a failure should surface as an error
   * rather than be silently swallowed. */
  async fetchGroupInfo(instanceName: string, groupJid: string): Promise<RawGroupInfo> {
    return this.request<RawGroupInfo>('GET', `/group/findGroupInfos/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`);
  }

  /** Same endpoint as fetchGroupInfo, but for the inbound-parsing path (naming
   * a newly-seen group) — known to sometimes 404 for a valid group (upstream
   * issue, not our bug), so this never throws: returns undefined on any
   * failure and the caller falls back to something else rather than losing
   * the whole inbound message over it. */
  async fetchGroupSubject(instanceName: string, groupJid: string): Promise<string | undefined> {
    try {
      const info = await this.fetchGroupInfo(instanceName, groupJid);
      return info?.subject || undefined;
    } catch (error) {
      logger.warn({ err: String(error), groupJid }, '[evolution] failed to fetch group subject');
      return undefined;
    }
  }

  /** POST /chat/getBase64FromMediaMessage/{instance} — decrypts a received
   * media message and returns it as base64 (WhatsApp media arrives as an
   * encrypted `.enc` URL that can't be played directly). Body shape confirmed
   * live against v2.3.7: `{ message: { key: { id } } }`. Never throws —
   * returns null on failure so a media hiccup degrades to a text placeholder. */
  async getBase64FromMedia(instanceName: string, messageId: string): Promise<{ base64: string; mimetype?: string } | null> {
    try {
      const res = await this.request<{ base64?: string; mimetype?: string }>(
        'POST',
        `/chat/getBase64FromMediaMessage/${instanceName}`,
        { message: { key: { id: messageId } } },
      );
      return res?.base64 ? { base64: res.base64, mimetype: res.mimetype } : null;
    } catch (error) {
      logger.warn({ err: String(error), messageId }, '[evolution] failed to fetch media base64');
      return null;
    }
  }

  /** POST /chat/findContacts/{instance} — v2 only (not in the official OpenAPI
   * spec; confirmed via Evolution's own docs/GitHub issues). Returns every
   * contact Baileys has synced from the connected phone's address book. */
  async fetchContacts(instanceName: string): Promise<RawContact[]> {
    const adapter = await this.getAdapter();
    if (adapter.major !== 2) {
      throw new Error('Importação de contatos requer Evolution API v2.');
    }
    return this.request<RawContact[]>('POST', `/chat/findContacts/${instanceName}`, { where: {} });
  }
}
