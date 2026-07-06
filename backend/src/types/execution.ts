import type { AgentId } from './agent.js';
import type { AIProviderId } from './provider.js';

/**
 * Threaded through the whole runtime for one request. `organizationId` is a
 * placeholder ('default-org' unless an `x-organization-id` header is sent) —
 * there's no real multi-tenant concept in this app yet, this just prepares
 * the seam for Analytics/Auditoria to key off of later.
 */
export interface ExecutionContext {
  requestId: string;
  organizationId: string;
  conversationId: string;
  agentId: AgentId;
  modelId: string;
  providerId: AIProviderId;
  startedAt: Date;
}

/**
 * Passed to every tool's `execute()` so tools don't take a growing list of
 * ad hoc parameters. `permissions`/`userId` are placeholders this sprint —
 * read by `ToolPermissionMiddleware` but not enforced yet (no operator-auth
 * threading into agent calls today).
 */
export interface ToolExecutionContext {
  organizationId: string;
  conversationId: string;
  contactId: string;
  userId?: string;
  permissions: string[];
  requestId: string;
}
