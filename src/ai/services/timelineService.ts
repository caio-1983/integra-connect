import type { TimelineEntry } from '@/types';
import type { HandoffReason } from '@/ai/types';
import { MOCK_TIMELINE_ENTRIES } from '@/constants';

const HANDOFF_REASON_LABEL: Record<HandoffReason, string> = {
  low_confidence: 'baixa confiança da IA',
  customer_requested_human: 'cliente pediu para falar com um atendente',
  financial_subject: 'assunto financeiro',
  critical_complaint: 'reclamação crítica',
  repeated_failures: 'múltiplas tentativas sem sucesso',
};

function makeId(): string {
  return `tl-ai-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function pushEntry(entry: TimelineEntry): void {
  // Mutates the shared mock array in place — same pattern this file already
  // relies on (no repository/data-access layer exists yet for Timeline).
  MOCK_TIMELINE_ENTRIES.unshift(entry);
}

export function logAgentStarted(conversationId: string, personId: string, agentName: string): void {
  pushEntry({
    id: makeId(),
    type: 'ai_action',
    content: `${agentName} iniciou o atendimento automático.`,
    personId,
    conversationId,
    createdByType: 'nina',
    createdByName: agentName,
    createdAt: new Date().toISOString(),
    source: 'ai',
  });
}

export function logAgentTransferred(conversationId: string, personId: string, reason: HandoffReason | undefined, agentName = 'Nina'): void {
  const reasonLabel = reason ? HANDOFF_REASON_LABEL[reason] : 'necessidade de atendimento humano';
  pushEntry({
    id: makeId(),
    type: 'transfer',
    content: `${agentName} transferiu o atendimento para um humano (${reasonLabel}).`,
    metadata: { reason },
    personId,
    conversationId,
    createdByType: 'nina',
    createdByName: agentName,
    createdAt: new Date().toISOString(),
    source: 'ai',
  });
}

export function logAgentAction(conversationId: string, personId: string, content: string, metadata?: Record<string, unknown>, agentName = 'Nina'): void {
  pushEntry({
    id: makeId(),
    type: 'ai_action',
    content,
    metadata,
    personId,
    conversationId,
    createdByType: 'nina',
    createdByName: agentName,
    createdAt: new Date().toISOString(),
    source: 'ai',
  });
}
