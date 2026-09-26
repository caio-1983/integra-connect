import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { logger } from '../logger/Logger.js';
import { getConnector } from './connectorRegistry.js';
import { ChannelEvents, type OutboundMessageRequestedPayload, type OutboundMessageSentPayload } from './channelEvents.js';
import { applySignature } from './outboundSignature.js';

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

    // Signed for the customer, clean for us: `text` below is deliberately the
    // unsigned original, so the timeline and the AI's history never carry the
    // attendant's name as if the customer had been told it twice.
    const outgoing = applySignature(req.text, req.signature, req.channel);
    const { providerMessageId } = await connector.sendText(req.instance, req.to, outgoing, {
      quotedProviderMessageId: req.quotedProviderMessageId,
    });

    const sent: OutboundMessageSentPayload = {
      conversationId: req.conversationId,
      channel: req.channel,
      providerMessageId,
      text: req.text,
      fromType: req.fromType,
      operatorId: req.operatorId,
      replyToId: req.replyToId,
    };
    await aiEventBus.publish({ type: ChannelEvents.OutboundMessageSent, payload: sent as unknown as Record<string, unknown>, timestamp: new Date() });
  });
}

register();
