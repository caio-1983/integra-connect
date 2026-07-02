// ============= Channel Types (Sprint 008 — Omnichannel) =============
//
// This module is the single seam a future real backend replaces: swap the
// mock-backed channel-service.ts for real persistence/webhooks and nothing
// here (or in any consuming component) needs to change shape.

export type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'webchat';

// Adding a new channel (email, SMS, Teams, Discord, ...) requires only:
//   1. extending ChannelType above
//   2. creating one provider class extending BaseChannelProvider (src/providers/base)
//   3. registering it in PROVIDER_REGISTRY (src/providers/registry.ts)
//   4. adding one entry to CHANNEL_CONFIG (src/lib/channelConfig.ts)
// No other file in the app should need to change.

export interface ChannelCapabilities {
  attachments: boolean;
  typing: boolean;
  reactions: boolean;
  readReceipts: boolean;
  voice: boolean;
  video: boolean;
}

export interface ChannelIdentity {
  channel: ChannelType;
  externalId: string;
  externalLabel?: string;
  linkedAt: string;
}

export interface ChannelBusinessHours {
  enabled: boolean;
  timezone: string;
  schedule: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', { start: string; end: string; active: boolean }>;
}

export interface ChannelAutoResponses {
  welcome?: string;
  afterHours?: string;
  transfer?: string;
  closing?: string;
}

export interface ChannelAccountStatus {
  channel: ChannelType;
  connected: boolean;
  accountName?: string;
  lastSyncAt?: string | null;
  aiEnabled: boolean;
  defaultAgentId?: string | null;
  greetingMessage?: string;
  autoTags?: string[];
  slaMinutes?: number;
  businessHours: ChannelBusinessHours;
  autoResponses: ChannelAutoResponses;
}

export interface WebchatWidgetConfig {
  primaryColor: string;
  agentName: string;
  companyName: string;
  greeting: string;
  offlineMessage: string;
  avatarUrl?: string;
  logoUrl?: string;
  position: 'bottom-right' | 'bottom-left';
  // Simulated operational info (mock only — no real widget is built/hosted this sprint)
  authorizedDomain: string;
  widgetStatus: 'active' | 'inactive';
  widgetVersion: string;
}

export interface ChannelInboundEvent {
  id: string;
  channel: ChannelType;
  contactExternalId: string;
  contactDisplayName: string;
  contactAvatarUrl?: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
}

export interface ChannelProvider {
  channel: ChannelType;
  capabilities: ChannelCapabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): ChannelAccountStatus;
  updateConfig(partial: Partial<ChannelAccountStatus>): void;
  sendMessage(content: string, target: string): Promise<void>;
  receiveMessage(overrides?: Partial<ChannelInboundEvent>): ChannelInboundEvent;
}

// Origin of a Timeline action — structural prep for AI/Automation sprints.
// No AI or automation logic is implemented this sprint; existing entries
// default to 'human' or 'system' to match their current createdByType.
export type TimelineSource = 'human' | 'ai' | 'automation' | 'system';
