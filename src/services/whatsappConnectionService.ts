/**
 * Single service responsible for all WhatsApp/Evolution communication
 * between the frontend and the Sprint 010/011/012 backend. It depends only on
 * the neutral backend-gateway connection (VITE_BACKEND_URL + the user's
 * session token) — never on any AI configuration. The frontend never talks to Evolution directly, only to our
 * own backend.
 */
import {
  backendBaseUrl as base,
  backendHeaders as headers,
  backendAuthOnlyHeaders as authOnlyHeaders,
  handleBackendResponse as handle,
} from './backendGateway';

export interface QrResult { base64?: string; pairingCode?: string; code?: string; }
export interface CreateInstanceResult { qr: QrResult; major: number; webhookUrl: string; }
export interface ConnectionStateResult { state: 'open' | 'connecting' | 'close' | 'unknown'; }

export async function createWhatsappInstance(instanceName: string): Promise<CreateInstanceResult> {
  const res = await fetch(`${base()}/v1/whatsapp/instances`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ instanceName }),
  });
  return handle<CreateInstanceResult>(res);
}

export async function fetchWhatsappQr(instanceName: string): Promise<QrResult> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}/qr`, { headers: await headers() });
  return handle<QrResult>(res);
}

export async function fetchWhatsappState(instanceName: string): Promise<ConnectionStateResult> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}/state`, { headers: await headers() });
  return handle<ConnectionStateResult>(res);
}

// ============= Sprint 012 — instance manager =============

export interface WhatsappInstanceSummary {
  name: string;
  number?: string;
  status: 'open' | 'connecting' | 'close';
  connected: boolean;
  profileName?: string;
  profilePicture?: string;
}

export async function listWhatsappInstances(): Promise<WhatsappInstanceSummary[]> {
  const res = await fetch(`${base()}/v1/whatsapp/instances`, { headers: await headers() });
  return handle<WhatsappInstanceSummary[]>(res);
}

export async function disconnectWhatsappInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}/disconnect`, {
    method: 'POST',
    headers: await authOnlyHeaders(),
  });
  await handle<{ ok: true }>(res);
}

export async function removeWhatsappInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
    headers: await authOnlyHeaders(),
  });
  await handle<{ ok: true }>(res);
}

export async function reconnectWhatsappInstance(instanceName: string): Promise<{ qr?: string }> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}/reconnect`, {
    method: 'POST',
    headers: await authOnlyHeaders(),
  });
  return handle<{ qr?: string }>(res);
}

export interface ImportContactsResult { imported: number; updated: number; }

export async function importWhatsappContacts(instanceName: string): Promise<ImportContactsResult> {
  const res = await fetch(`${base()}/v1/whatsapp/instances/${encodeURIComponent(instanceName)}/contacts/import`, {
    method: 'POST',
    headers: await authOnlyHeaders(),
  });
  return handle<ImportContactsResult>(res);
}

// ============= Operador — resposta manual via Evolution =============

/** Sends a human operator's reply through the backend's channel-agnostic
 * outbound pipeline (resolves the right connector/instance server-side).
 *
 * The author (`messages.sent_by`, the `*Nome*` signature) is whoever owns the
 * session token the request carries — the backend reads it from there, so no
 * operator id is sent. */
export async function sendConversationReply(
  conversationId: string,
  content: string,
  replyToMessageId?: string,
): Promise<void> {
  const res = await fetch(`${base()}/v1/conversations/${encodeURIComponent(conversationId)}/reply`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ content, replyToMessageId }),
  });
  await handle<{ accepted: true }>(res);
}

/** Edits the text of the operator's own message (WhatsApp, up to 15 minutes
 * after sending; "own" = the session user's). A refusal throws the backend's
 * own reason (e.g. the window has passed), which is meant to be shown to the
 * attendant as is. */
export async function editConversationMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<void> {
  const res = await fetch(
    `${base()}/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/edit`,
    { method: 'POST', headers: await headers(), body: JSON.stringify({ content }) },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Erro ao editar mensagem.');
  }
}

/** Transcribes a customer voice note on demand. The text arrives on the
 * message row (realtime); the returned status is for immediate feedback. */
export async function transcribeConversationAudio(conversationId: string, messageId: string): Promise<'done' | 'skipped' | 'failed'> {
  const res = await fetch(
    `${base()}/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/transcribe`,
    // '{}' body: Fastify rejects an empty body sent as application/json.
    { method: 'POST', headers: await headers(), body: '{}' },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Erro ao transcrever o áudio.');
  }
  return ((await res.json()) as { status: 'done' | 'skipped' | 'failed' }).status;
}

export interface SendMediaReplyInput { base64: string; mimeType: string; fileName?: string; caption?: string; }

/** Sends a human operator's media reply (attachment). base64 has no data: prefix. */
export async function sendConversationMediaReply(conversationId: string, media: SendMediaReplyInput): Promise<void> {
  const res = await fetch(`${base()}/v1/conversations/${encodeURIComponent(conversationId)}/reply-media`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(media),
  });
  await handle<{ accepted: true }>(res);
}

/** Sends the company's registered Pix key as a card ("Copiar chave Pix"). The
 * key is read server-side from Configurações and the operator from the session
 * token, so the body is empty. A refusal throws the backend's own reason (e.g.
 * no key registered yet). */
export async function sendConversationPix(conversationId: string): Promise<void> {
  const res = await fetch(`${base()}/v1/conversations/${encodeURIComponent(conversationId)}/reply-pix`, {
    method: 'POST',
    headers: await headers(),
    // '{}' body: Fastify rejects an empty body sent as application/json.
    body: '{}',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || 'Erro ao enviar a chave Pix.');
  }
}

export interface StartConversationResult { conversationId: string; contactId: string; created: boolean; }

/** "Nova Conversa" — finds or creates the contact/conversation ahead of the first message. */
export async function startConversation(instance: string, phone: string, name?: string): Promise<StartConversationResult> {
  const res = await fetch(`${base()}/v1/conversations/start`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ instance, phone, name }),
  });
  return handle<StartConversationResult>(res);
}

export interface GroupParticipant { phoneNumber: string; isAdmin: boolean; name?: string; }
export interface GroupInfoResult { subject?: string; participants: GroupParticipant[]; }

/** Lists a WhatsApp group conversation's current members. */
export async function fetchGroupParticipants(conversationId: string): Promise<GroupInfoResult> {
  const res = await fetch(`${base()}/v1/conversations/${encodeURIComponent(conversationId)}/group-participants`, {
    headers: await headers(),
  });
  return handle<GroupInfoResult>(res);
}
