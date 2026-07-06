import type { ExecutionContext } from '../types/index.js';
import { logger } from '../logger/Logger.js';

/**
 * The single pub/sub bus for the whole backend. `AgentRuntime` publishes AI
 * lifecycle events here; the channel layer (Sprint 011) publishes inbound/
 * outbound/conversation events here too. No service calls another directly
 * when an event can carry it — Telemetry, Analytics, Automações all just
 * subscribe.
 *
 * `publish` is async-aware: it awaits every handler and never throws to the
 * caller (a failing handler is logged, the chain continues). Fire-and-forget
 * callers (e.g. the thin webhook) simply don't await the returned promise.
 */
export type AIEventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'tool.executed'
  | 'handoff.decided';

/** Base shape for every event on the bus. `executionContext` is present only on AI-runtime events. */
export interface AppEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  executionContext?: ExecutionContext;
}

type Handler = (event: AppEvent) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Handler[]>();

  on(type: string, handler: Handler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async publish(event: AppEvent): Promise<void> {
    const handlers = [...(this.handlers.get(event.type) ?? []), ...(this.handlers.get('*') ?? [])];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error({ event: event.type, err: error instanceof Error ? error.message : String(error) }, '[eventbus] handler failed');
      }
    }
  }
}

export const aiEventBus = new EventBus();
