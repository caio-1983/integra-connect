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

/** A grant of one user's access to one WhatsApp instance (many-to-many —
 *  multiple users can share the same instance_name). Keyed by instance_name
 *  since there's no `whatsapp_instances` table (see whatsapp_instance_access
 *  migration comment for the trade-off). */
export interface InstanceAccessGrant {
  id: string;
  instance_name: string;
  user_id: string;
  granted_by: string | null;
  created_at: string;
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
