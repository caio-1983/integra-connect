import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { getConnector } from './connectorRegistry.js';
import { ChannelEvents, type OutboundMessageRequestedPayload, type OutboundMessageSentPayload } from './channelEvents.js';
import { applySignature } from './outboundSignature.js';

/**
 * Sends one text through the right connector, then publishes
 * `OutboundMessageSent` (which persists the row). Throws when the send fails,
 * so a caller that needs to know — the attendant's manual reply — finds out.
 */
export async function deliverOutbound(req: OutboundMessageRequestedPayload): Promise<void> {
  const connector = getConnector(req.provider);
  if (!connector) throw new Error('Conector de canal indisponível.');

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
}

/**
 * The AI's replies arrive as `OutboundMessageRequested` (Ajuste 4); the runtime
 * and agents never send to Evolution directly. A failure here is only logged
 * (by the bus), since no one is waiting on the AI's send — which is exactly why
 * the attendant's manual reply calls `deliverOutbound` directly instead.
 */
function register(): void {
  aiEventBus.on(ChannelEvents.OutboundMessageRequested, async (event: AppEvent) => {
    await deliverOutbound(event.payload as unknown as OutboundMessageRequestedPayload);
  });
}

register();
