import type { ChannelAccountStatus, ChannelInboundEvent, ChannelType, WebchatWidgetConfig } from '@/types';
import { MOCK_PEOPLE } from '@/lib/mockData';

/**
 * Mock-backed persistence + event bus for the channel system.
 *
 * This module is the single seam a real backend implementation replaces:
 * swap the localStorage reads/writes for Supabase queries and the
 * CustomEvent bus for real webhooks, and no provider or UI component needs
 * to change — they all go through the functions exported here.
 */

const SETTINGS_STORAGE_KEY = 'ic_channel_settings_v1';
const WEBCHAT_WIDGET_STORAGE_KEY = 'ic_webchat_widget_config_v1';
const INBOUND_EVENT_NAME = 'integra:channel-inbound';

type ChannelSettingsStore = Partial<Record<ChannelType, ChannelAccountStatus>>;

function readJSON<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — mock persistence is best-effort.
  }
}

// ---------------------------------------------------------------------------
// Per-channel account status (Conexões)
// ---------------------------------------------------------------------------

export function getChannelStatus(channel: ChannelType, fallback: ChannelAccountStatus): ChannelAccountStatus {
  const store = readJSON<ChannelSettingsStore>(SETTINGS_STORAGE_KEY) ?? {};
  return store[channel] ?? fallback;
}

export function updateChannelStatus(
  channel: ChannelType,
  partial: Partial<ChannelAccountStatus>,
  fallback: ChannelAccountStatus
): ChannelAccountStatus {
  const store = readJSON<ChannelSettingsStore>(SETTINGS_STORAGE_KEY) ?? {};
  const next: ChannelAccountStatus = { ...(store[channel] ?? fallback), ...partial };
  store[channel] = next;
  writeJSON(SETTINGS_STORAGE_KEY, store);
  return next;
}

// ---------------------------------------------------------------------------
// Webchat widget configuration (Entrega 4/5 — Chat do Site page)
// ---------------------------------------------------------------------------

export function getWebchatWidgetConfig(fallback: WebchatWidgetConfig): WebchatWidgetConfig {
  const stored = readJSON<Partial<WebchatWidgetConfig>>(WEBCHAT_WIDGET_STORAGE_KEY);
  return stored ? { ...fallback, ...stored } : fallback;
}

export function updateWebchatWidgetConfig(
  partial: Partial<WebchatWidgetConfig>,
  fallback: WebchatWidgetConfig
): WebchatWidgetConfig {
  const next = { ...getWebchatWidgetConfig(fallback), ...partial };
  writeJSON(WEBCHAT_WIDGET_STORAGE_KEY, next);
  return next;
}

// ---------------------------------------------------------------------------
// Simulated inbound event bus
// ---------------------------------------------------------------------------

export function publishInboundEvent(event: ChannelInboundEvent): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChannelInboundEvent>(INBOUND_EVENT_NAME, { detail: event }));
}

export function subscribeToInboundEvents(handler: (event: ChannelInboundEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<ChannelInboundEvent>).detail);
  window.addEventListener(INBOUND_EVENT_NAME, listener);
  return () => window.removeEventListener(INBOUND_EVENT_NAME, listener);
}

// ---------------------------------------------------------------------------
// Contact resolution / dedup (Entrega 7 — unified history, no duplicate customers)
// ---------------------------------------------------------------------------

/**
 * Resolves an inbound channel identity to an existing Person, mirroring what
 * a real backend would do (match phone/handle/etc. against `contacts`
 * before creating a new one). Returns null when no known Person has this
 * channel identity linked — a real implementation would create a new
 * contact in that case instead of a duplicate.
 */
export function resolveChannelIdentityToPersonId(channel: ChannelType, externalId: string): string | null {
  const person = MOCK_PEOPLE.find((p) =>
    p.channelIdentities?.some((identity) => identity.channel === channel && identity.externalId === externalId)
  );
  return person?.id ?? null;
}
