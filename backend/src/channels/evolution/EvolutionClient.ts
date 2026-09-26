import type {
  ConnectionStateResult, CreateInstanceParams, EvolutionAdapter, QrResult, RawContact, RawFetchedInstance, RawGroupInfo, SendMediaParams, SendTextResult,
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

/**
 * Did this call fail because there was no live socket to act on? Evolution
 * signals that two ways:
 *
 *  - 400 "instance is not connected" — its own guard, when it knows the
 *    instance is down before the call reaches Baileys.
 *  - 500 "Error: Connection Closed" — Baileys throwing from inside, when the
 *    socket is gone. A 500 because it is an unhandled exception upstream, not
 *    because anything is wrong on our side.
 *
 * IMPORTANT: this says nothing about the state the instance ends up in. In
 * particular Evolution can keep reporting an instance as `open` after a
 * "Connection Closed" logout, meaning the logout achieved nothing — so callers
 * must confirm the resulting state instead of treating this as success. Naming
 * it after the symptom (dead socket) rather than the conclusion (already
 * disconnected) is deliberate: the earlier name invited exactly that wrong
 * inference, and shipped a success toast over an instance still shown online.
 */
function failedOnDeadSocket(error: unknown): boolean {
  if (!(error instanceof EvolutionApiError)) return false;
  if (error.status !== 400 && error.status !== 500) return false;
  const body = error.body as { response?: { message?: unknown }; message?: unknown } | undefined;
  const raw = body?.response?.message ?? body?.message;
  const text = Array.isArray(raw) ? raw.join(' ') : String(raw ?? '');
  const normalized = text.toLowerCase();
  return normalized.includes('not connected') || normalized.includes('connection closed');
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

  async sendText(instanceName: string, number: string, text: string, quotedId?: string): Promise<SendTextResult> {
    const adapter = await this.getAdapter();
    const response = await this.request<unknown>('POST', `/message/sendText/${instanceName}`, adapter.sendTextBody({ number, text, quotedId }));
    return adapter.parseSendResult(response);
  }

  /** POST /message/sendMedia/{instance} — sends image/video/audio/document.
   *  `media` is base64 (no data: prefix) or a public URL; v1/v2 body differences
   *  are handled by the adapter. */
  async sendMedia(instanceName: string, params: Omit<SendMediaParams, 'number'> & { number: string }): Promise<SendTextResult> {
    const adapter = await this.getAdapter();
    const response = await this.request<unknown>('POST', `/message/sendMedia/${instanceName}`, adapter.sendMediaBody(params));
    return adapter.parseSendResult(response);
  }

  /** GET /instance/fetchInstances — identical shape on v1 and v2 (verified against the official OpenAPI specs). */
  async fetchInstances(): Promise<RawFetchedInstance[]> {
    return this.request<RawFetchedInstance[]>('GET', '/instance/fetchInstances');
  }

  /**
   * DELETE /instance/logout/{instance} — disconnects the session, keeps the
   * instance registered.
   *
   * A dead-socket failure is ambiguous, so it is resolved by asking for the
   * state rather than assuming one:
   *  - no longer `open` → there was nothing left to close; the caller's goal is
   *    already met, so this succeeds quietly.
   *  - still `open` → the logout did nothing and Evolution is stuck
   *    advertising a session that no longer exists. Reporting success here is
   *    what made the UI show "desconectado" over a card still reading
   *    "conectado", so it fails loudly with the one thing that clears it.
   */
  async logout(instanceName: string): Promise<void> {
    try {
      await this.request<unknown>('DELETE', `/instance/logout/${instanceName}`);
      return;
    } catch (error) {
      if (!failedOnDeadSocket(error)) throw error;

      const state = await this.connectionState(instanceName).catch(() => undefined);
      if (state?.state === 'open') {
        throw new Error(
          `A instância "${instanceName}" está em estado inconsistente na Evolution: ela ainda é `
          + 'reportada como conectada, mas a sessão do WhatsApp já caiu, então desconectar não tem '
          + 'efeito. Remova a instância e pareie o número novamente, ou reinicie a instância na Evolution.',
        );
      }
      logger.info(
        { instanceName, state: state?.state ?? 'indisponivel' },
        '[evolution] logout sem sessão viva e instância já fora de "open" — tratando como no-op',
      );
    }
  }

  /**
   * DELETE /instance/delete/{instance} — Evolution logs out internally first if
   * still connected, which means this inherits the same dead-socket failure as
   * logout() above. It matters more here: this is what the logout error tells
   * the user to fall back to, so it must not dead-end on the same stuck state.
   *
   * Resolved by outcome, never by assumption — for a delete, the only proof is
   * that the instance is gone from the list. Anything less and we would be
   * reporting a removal that did not happen, leaving the instance registered.
   */
  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await this.request<unknown>('DELETE', `/instance/delete/${instanceName}`);
      return;
    } catch (error) {
      if (!failedOnDeadSocket(error)) throw error;

      const stillListed = await this.fetchInstances()
        .then((list) => list.some((raw) => (raw.instance?.instanceName ?? raw.name) === instanceName))
        .catch(() => true); // Cannot confirm removal → treat as not removed.

      if (stillListed) {
        throw new Error(
          `Não foi possível remover a instância "${instanceName}": a sessão do WhatsApp já caiu e a `
          + 'Evolution não concluiu a remoção. Reinicie a instância na Evolution e tente de novo.',
        );
      }
      logger.info({ instanceName }, '[evolution] delete falhou sem sessão viva, mas a instância saiu da lista — tratando como removida');
    }
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
