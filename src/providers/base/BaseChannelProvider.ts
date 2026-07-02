import type {
  ChannelAccountStatus,
  ChannelCapabilities,
  ChannelInboundEvent,
  ChannelProvider,
  ChannelType,
} from '@/types';
import { getChannelStatus, publishInboundEvent, updateChannelStatus } from '@/services/channel-service';

/**
 * Shared base for every channel provider. Concrete providers only declare
 * their identity, capabilities and default status — connect/disconnect/
 * config persistence and inbound-event publishing are handled here so every
 * channel behaves consistently. sendMessage/receiveMessage are mocked this
 * sprint (no real channel API is called) but keep the exact shape a future
 * real implementation would use.
 */
export abstract class BaseChannelProvider implements ChannelProvider {
  abstract readonly channel: ChannelType;
  abstract readonly capabilities: ChannelCapabilities;

  protected abstract defaultStatus(): ChannelAccountStatus;

  getStatus(): ChannelAccountStatus {
    return getChannelStatus(this.channel, this.defaultStatus());
  }

  updateConfig(partial: Partial<ChannelAccountStatus>): void {
    updateChannelStatus(this.channel, partial, this.defaultStatus());
  }

  async connect(): Promise<void> {
    this.updateConfig({ connected: true, lastSyncAt: new Date().toISOString() });
  }

  async disconnect(): Promise<void> {
    this.updateConfig({ connected: false });
  }

  async sendMessage(content: string, target: string): Promise<void> {
    // Mocked this sprint — a real provider would call the channel's send API here.
    console.info(`[channel:${this.channel}] mock sendMessage ->`, target, content);
  }

  receiveMessage(overrides: Partial<ChannelInboundEvent> = {}): ChannelInboundEvent {
    const event: ChannelInboundEvent = {
      id: overrides.id ?? `evt-${this.channel}-${Date.now()}`,
      channel: this.channel,
      contactExternalId: overrides.contactExternalId ?? 'unknown',
      contactDisplayName: overrides.contactDisplayName ?? 'Novo Contato',
      contactAvatarUrl: overrides.contactAvatarUrl,
      content: overrides.content ?? 'Mensagem simulada recebida.',
      type: overrides.type ?? 'text',
      timestamp: overrides.timestamp ?? new Date().toISOString(),
    };
    publishInboundEvent(event);
    return event;
  }
}
