// ============= WhatsApp Instance Types (Sprint 012 — Gestão de Conexões) =============
// Mirrors backend/src/channels/evolution/types.ts `InstanceSummary` — the
// only shape the frontend ever sees, regardless of the Evolution version.

export interface WhatsappInstanceSummary {
  name: string;
  number?: string;
  status: 'open' | 'connecting' | 'close';
  connected: boolean;
  profileName?: string;
  profilePicture?: string;
}

// Extension point for future per-instance routing config (Inbox, Agente IA
// padrão, Equipe responsável, Horário de atendimento, Tags, Regras de
// distribuição). Not populated or rendered this sprint — just the typed
// surface so a later sprint can attach it to WhatsappInstanceSummary.
export interface WhatsappInstanceSettings {
  inboxId?: string;
  defaultAgentId?: string;
  teamId?: string;
  businessHours?: unknown;
  tags?: string[];
  distributionRule?: string;
}
