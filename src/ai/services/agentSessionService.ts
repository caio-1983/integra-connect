import type { AgentId, AgentSession } from '@/ai/types';

/** localStorage CRUD for AgentSession — mirrors channel-service.ts's readJSON/writeJSON pattern. */
const STORAGE_KEY = 'ic_agent_sessions_v1';

type SessionStore = Record<string, AgentSession>;

function readAll(): SessionStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionStore) : {};
  } catch {
    return {};
  }
}

function writeAll(store: SessionStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable — mock persistence is best-effort.
  }
}

export function getSession(conversationId: string): AgentSession | undefined {
  return readAll()[conversationId];
}

export function getOrInitSession(conversationId: string, defaultAgentId: AgentId): AgentSession {
  const store = readAll();
  if (store[conversationId]) return store[conversationId];

  const session: AgentSession = {
    conversationId,
    mode: 'autonomous',
    activeAgentId: defaultAgentId,
    handoffHistory: [],
    processedMessageIds: [],
    updatedAt: new Date().toISOString(),
  };
  store[conversationId] = session;
  writeAll(store);
  return session;
}

export function updateSession(conversationId: string, partial: Partial<AgentSession>): AgentSession {
  const store = readAll();
  const current = store[conversationId] ?? getOrInitSession(conversationId, 'atendimento');
  const next: AgentSession = { ...current, ...partial, updatedAt: new Date().toISOString() };
  store[conversationId] = next;
  writeAll(store);
  return next;
}
