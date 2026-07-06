import { aiEventBus, type AppEvent } from '../runtime/EventBus.js';
import { logger } from '../logger/Logger.js';

/**
 * Subscribes to `EventBus` — `AgentRuntime` never calls this directly. In
 * memory only this sprint (last ~200 events) plus one structured Pino log
 * line per event; no DB, no dashboard (Entrega 8 stays deferred). Records
 * both AI-runtime events and Sprint 011 channel events for free observability.
 */
const RING_BUFFER_SIZE = 200;
const buffer: AppEvent[] = [];

function record(event: AppEvent): void {
  buffer.push(event);
  if (buffer.length > RING_BUFFER_SIZE) buffer.shift();
  logger.info(
    {
      event: event.type,
      requestId: event.executionContext?.requestId,
      agentId: event.executionContext?.agentId,
      payload: event.payload,
    },
    `[telemetry] ${event.type}`,
  );
}

// AI-runtime events (Sprint 010)
aiEventBus.on('execution.started', record);
aiEventBus.on('execution.completed', record);
aiEventBus.on('execution.failed', record);
aiEventBus.on('tool.executed', record);
aiEventBus.on('handoff.decided', record);

// Channel events (Sprint 011)
aiEventBus.on('InboundMessageReceived', record);
aiEventBus.on('OutboundMessageRequested', record);
aiEventBus.on('OutboundMessageSent', record);
aiEventBus.on('ConversationCreated', record);
aiEventBus.on('ConversationUpdated', record);

export function getRecentExecutions(): AppEvent[] {
  return [...buffer];
}
