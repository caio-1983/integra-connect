import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { logger } from '../logger/Logger.js';
import { getConnector } from './connectorRegistry.js';
import {
  ChannelEvents,
  type InboundMessageReceivedPayload,
  type InboundWebhookReceivedPayload,
  type MessageStatusUpdatedPayload,
} from './channelEvents.js';

/**
 * Subscribes to the raw `InboundWebhookReceived`, identifies the provider,
 * normalizes+validates via that provider's connector, and publishes the
 * channel-agnostic event for whichever kind it turned out to be — a new
 * message (Ajuste 2) or a delivery-status change. This is the only place
 * channel-specific parsing happens; downstream never sees Evolution.
 */
function register(): void {
  aiEventBus.on(ChannelEvents.InboundWebhookReceived, async (event: AppEvent) => {
    const { provider, rawBody } = event.payload as unknown as InboundWebhookReceivedPayload;

    const connector = getConnector(provider);
    if (!connector) {
      logger.warn({ provider }, '[orchestrator] no connector registered for provider');
      return;
    }

    const parsed = await connector.parseEvent(rawBody);
    if (!parsed) return; // dropped: not a 1:1 text message, our own echo, a group, an unrecognized event, etc.

    if (parsed.kind === 'message') {
      const payload: InboundMessageReceivedPayload = { provider, ...parsed.data };
      await aiEventBus.publish({ type: ChannelEvents.InboundMessageReceived, payload: payload as unknown as Record<string, unknown>, timestamp: new Date() });
      return;
    }

    const payload: MessageStatusUpdatedPayload = parsed.data;
    await aiEventBus.publish({ type: ChannelEvents.MessageStatusUpdated, payload: payload as unknown as Record<string, unknown>, timestamp: new Date() });
  });
}

register();
