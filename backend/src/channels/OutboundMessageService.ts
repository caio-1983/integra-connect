import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { logger } from '../logger/Logger.js';
import { getConnector } from './connectorRegistry.js';
import { ChannelEvents, type OutboundMessageRequestedPayload, type OutboundMessageSentPayload } from './channelEvents.js';

/**
 * Subscribes to `OutboundMessageRequested`, routes by provider to the right
 * connector's `sendText`, then publishes `OutboundMessageSent` (Ajuste 4). The
 * runtime/agents never send to Evolution directly. Future channels: no change
 * here beyond a new connector in the registry.
 */
function register(): void {
  aiEventBus.on(ChannelEvents.OutboundMessageRequested, async (event: AppEvent) => {
    const req = event.payload as unknown as OutboundMessageRequestedPayload;

    const connector = getConnector(req.provider);
    if (!connector) {
      logger.warn({ provider: req.provider }, '[outbound] no connector registered for provider');
      return;
    }

    const { providerMessageId } = await connector.sendText(req.instance, req.to, req.text);

    const sent: OutboundMessageSentPayload = {
      conversationId: req.conversationId,
      providerMessageId,
      text: req.text,
      fromType: req.fromType,
    };
    await aiEventBus.publish({ type: ChannelEvents.OutboundMessageSent, payload: sent as unknown as Record<string, unknown>, timestamp: new Date() });
  });
}

register();
