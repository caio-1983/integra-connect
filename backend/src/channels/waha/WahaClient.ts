import { logger } from '../../logger/Logger.js';

export class WahaApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown, message: string) {
    super(message);
  }
}

/** WAHA session status (GOWS engine). */
export type WahaSessionStatus = 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';

/** One entry of `GET /api/sessions?all=true`. Only the fields we read. */
export interface WahaSession {
  name: string;
  status: WahaSessionStatus;
  me?: { id?: string; pushName?: string; lid?: string } | null;
  config?: { metadata?: Record<string, string> | null } | null;
}

export interface WahaWebhookConfig {
  url: string;
  events: string[];
  hmacKey: string;
}

/** A file for the send endpoints: base64 bytes (no data: prefix) or a URL. */
export interface WahaFile {
  mimetype: string;
  filename?: string;
  data?: string;
  url?: string;
}

/**
 * Turns an instance name ("Evelim Oliveira") into a WAHA session name.
 * WAHA only accepts `[a-zA-Z0-9_-]`, so the real name travels in the session
 * metadata (`instance`) and comes back on every webhook — the session name is
 * an internal key nobody sees.
 */
export function sessionNameFor(instance: string): string {
  const slug = instance
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'instancia';
}

/** WhatsApp ids WAHA takes as `chatId`: `@c.us` for people, `@g.us` for groups. */
export function toChatId(to: string): string {
  if (to.includes('@')) return to.replace(/@s\.whatsapp\.net$/, '@c.us');
  return `${to.replace(/\D/g, '')}@c.us`;
}

/**
 * The WAHA message id `{fromMe}_{chatId}_{rawId}[_{participant}]`. Our database
 * keeps the RAW id (the same `3EB0…`/`AC…` id Evolution stored), so quotes and
 * edits of messages from before the migration still match.
 */
export function rawMessageId(serialized: string): string {
  const parts = serialized.split('_');
  if (parts.length >= 3 && (parts[0] === 'true' || parts[0] === 'false')) return parts[2];
  return serialized;
}

/** Rebuilds the serialized id WAHA wants for reply_to / edit from a raw id. */
export function serializedMessageId(fromMe: boolean, chatId: string, rawId: string): string {
  return rawId.includes('_') ? rawId : `${fromMe}_${chatId}_${rawId}`;
}

/**
 * Thin HTTP client to a WAHA server (https://waha.devlike.pro). One API key
 * (`X-Api-Key`) for every call, including media downloads. Verified against
 * WAHA 2026.10.1 with the GOWS engine on 2026-11-13.
 */
export class WahaClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Api-Key': this.apiKey },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = text;
    }
    if (!res.ok) {
      throw new WahaApiError(res.status, json, `[waha] ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return json as T;
  }

  // --- sessions -------------------------------------------------------------

  async listSessions(): Promise<WahaSession[]> {
    return this.request<WahaSession[]>('GET', '/api/sessions?all=true');
  }

  async getSession(session: string): Promise<WahaSession | null> {
    try {
      return await this.request<WahaSession>('GET', `/api/sessions/${encodeURIComponent(session)}`);
    } catch (error) {
      if (error instanceof WahaApiError && error.status === 404) return null;
      throw error;
    }
  }

  /** Creates and starts the session, or (if it exists) updates its webhook and starts it. */
  async upsertSession(session: string, instance: string, webhook: WahaWebhookConfig): Promise<void> {
    const config = {
      metadata: { instance },
      webhooks: [{
        url: webhook.url,
        events: webhook.events,
        hmac: { key: webhook.hmacKey },
        retries: { policy: 'exponential', delaySeconds: 2, attempts: 8 },
      }],
    };
    const existing = await this.getSession(session);
    if (!existing) {
      await this.request('POST', '/api/sessions', { name: session, start: true, config });
      return;
    }
    await this.request('PUT', `/api/sessions/${encodeURIComponent(session)}`, { config });
    if (existing.status === 'STOPPED' || existing.status === 'FAILED') {
      await this.request('POST', `/api/sessions/${encodeURIComponent(session)}/restart`);
    }
  }

  async restartSession(session: string): Promise<void> {
    await this.request('POST', `/api/sessions/${encodeURIComponent(session)}/restart`);
  }

  async logoutSession(session: string): Promise<void> {
    await this.request('POST', `/api/sessions/${encodeURIComponent(session)}/logout`, {});
  }

  async deleteSession(session: string): Promise<void> {
    await this.request('DELETE', `/api/sessions/${encodeURIComponent(session)}`);
  }

  /** QR as a PNG data URL, or undefined when the session is not waiting for a scan. */
  async getQrDataUrl(session: string): Promise<string | undefined> {
    try {
      const file = await this.request<{ mimetype?: string; data?: string }>('GET', `/api/${encodeURIComponent(session)}/auth/qr?format=image`);
      return file?.data ? `data:${file.mimetype ?? 'image/png'};base64,${file.data}` : undefined;
    } catch (error) {
      // 422/400 while the session is starting or already paired.
      if (error instanceof WahaApiError && error.status < 500) return undefined;
      throw error;
    }
  }

  // --- messages -------------------------------------------------------------

  async sendText(session: string, chatId: string, text: string, replyTo?: string): Promise<{ providerMessageId?: string }> {
    const res = await this.request<Record<string, any>>('POST', '/api/sendText', {
      session, chatId, text, ...(replyTo ? { reply_to: replyTo } : {}), linkPreview: true,
    });
    return { providerMessageId: sentId(res) };
  }

  async sendFile(
    session: string,
    kind: 'image' | 'video' | 'voice' | 'file',
    chatId: string,
    file: WahaFile,
    caption?: string,
  ): Promise<{ providerMessageId?: string }> {
    const path = kind === 'image' ? '/api/sendImage' : kind === 'video' ? '/api/sendVideo' : kind === 'voice' ? '/api/sendVoice' : '/api/sendFile';
    const body: Record<string, unknown> = { session, chatId, file };
    if (caption && kind !== 'voice') body.caption = caption;
    // WhatsApp only plays OGG/Opus as a voice note; WAHA converts with ffmpeg.
    if (kind === 'voice' || kind === 'video') body.convert = kind === 'voice';
    const res = await this.request<Record<string, any>>('POST', path, body);
    return { providerMessageId: sentId(res) };
  }

  async editText(session: string, chatId: string, serializedId: string, text: string): Promise<void> {
    await this.request(
      'PUT',
      `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(serializedId)}`,
      { text, linkPreview: true },
    );
  }

  async getMessages(session: string, chatId: string, opts: { limit: number; sinceSec?: number }): Promise<Record<string, any>[]> {
    const q = new URLSearchParams({ limit: String(opts.limit), downloadMedia: 'false', sortBy: 'timestamp', sortOrder: 'desc' });
    if (opts.sinceSec) q.set('filter.timestamp.gte', String(opts.sinceSec));
    return this.request('GET', `/api/${encodeURIComponent(session)}/chats/${encodeURIComponent(chatId)}/messages?${q}`);
  }

  /** Downloads a media file WAHA already saved (its `media.url` needs the API key too). */
  async downloadMedia(url: string): Promise<{ base64: string; mimetype?: string }> {
    // WAHA builds the URL from WAHA_BASE_URL; rewrite it onto the base we use,
    // so a public base URL on WAHA does not force the backend out to the internet.
    let target = url;
    try {
      const u = new URL(url);
      target = this.url(u.pathname + u.search);
    } catch {
      // Not absolute — use as given.
    }
    const res = await fetch(target, { headers: { 'X-Api-Key': this.apiKey }, signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new WahaApiError(res.status, undefined, `[waha] media download → ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString('base64'), mimetype: res.headers.get('content-type') ?? undefined };
  }

  // --- contacts / groups ----------------------------------------------------

  /** Phone JID for a `@lid`, from WAHA's own map. Undefined when unknown. */
  async phoneForLid(session: string, lid: string): Promise<string | undefined> {
    try {
      const res = await this.request<{ pn?: string | null }>('GET', `/api/${encodeURIComponent(session)}/lids/${encodeURIComponent(lid)}`);
      return res?.pn ?? undefined;
    } catch (error) {
      logger.debug({ err: String(error) }, '[waha] lid lookup failed');
      return undefined;
    }
  }

  /** The chatId WhatsApp really uses for this number (Brazilian 9th digit), or undefined if not on WhatsApp. */
  async checkNumber(session: string, phone: string): Promise<{ exists: boolean; chatId?: string }> {
    const q = new URLSearchParams({ phone: phone.replace(/\D/g, ''), session });
    // GOWS answers chatId as the `@lid` and the phone JID as `pn`; the phone JID
    // is what we store and send to, so it wins.
    const res = await this.request<{ numberExists?: boolean; chatId?: string | null; pn?: string | null }>('GET', `/api/contacts/check-exists?${q}`);
    return { exists: res?.numberExists === true, chatId: res?.pn ?? res?.chatId ?? undefined };
  }

  async profilePictureUrl(session: string, contactId: string): Promise<string | undefined> {
    const q = new URLSearchParams({ contactId: toChatId(contactId), session });
    const res = await this.request<{ profilePictureURL?: string | null; url?: string | null }>('GET', `/api/contacts/profile-picture?${q}`);
    return res?.profilePictureURL ?? res?.url ?? undefined;
  }

  /** Group name. GOWS returns whatsmeow's raw GroupInfo (`Name`), other engines `subject`. */
  async groupSubject(session: string, groupId: string): Promise<string | undefined> {
    try {
      const info = await this.request<Record<string, any>>('GET', `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(groupId)}`);
      const subject = info?.Name ?? info?.subject;
      return typeof subject === 'string' && subject.trim() ? subject.trim() : undefined;
    } catch (error) {
      logger.debug({ err: String(error) }, '[waha] group info failed');
      return undefined;
    }
  }

  /** Address book synced on the phone. GOWS keys most entries by `@lid`. */
  async allContacts(session: string): Promise<Array<{ id?: string; name?: string | null; pushname?: string | null }>> {
    const out: Array<{ id?: string; name?: string | null; pushname?: string | null }> = [];
    for (let offset = 0; ; offset += 1000) {
      const q = new URLSearchParams({ session, limit: '1000', offset: String(offset) });
      const page = await this.request<typeof out>('GET', `/api/contacts/all?${q}`);
      out.push(...(page ?? []));
      if (!page || page.length < 1000) return out;
    }
  }

  /** The whole lid → phone map WAHA has learned for this session. */
  async allLids(session: string): Promise<Array<{ lid: string; pn: string }>> {
    const out: Array<{ lid: string; pn: string }> = [];
    for (let offset = 0; ; offset += 1000) {
      const q = new URLSearchParams({ limit: '1000', offset: String(offset) });
      const page = await this.request<Array<{ lid?: string; pn?: string }>>('GET', `/api/${encodeURIComponent(session)}/lids?${q}`);
      for (const row of page ?? []) if (row.lid && row.pn) out.push({ lid: row.lid, pn: row.pn });
      if (!page || page.length < 1000) return out;
    }
  }

  async groupParticipants(session: string, groupId: string): Promise<Array<{ id?: string; pn?: string | null; role?: string }>> {
    return this.request('GET', `/api/${encodeURIComponent(session)}/groups/${encodeURIComponent(groupId)}/participants/v2`);
  }
}

/** Raw id of a message WAHA just sent: `_data.Info.ID`, else the tail of `id`. */
function sentId(res: Record<string, any> | undefined): string | undefined {
  const raw = res?._data?.Info?.ID ?? res?.key?.id;
  if (typeof raw === 'string' && raw) return raw;
  const id = typeof res?.id === 'string' ? res.id : res?.id?._serialized;
  return typeof id === 'string' && id ? rawMessageId(id) : undefined;
}
