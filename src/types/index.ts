// ============= Channel Types (Sprint 008) =============
export * from './channel';
import type { ChannelType, ChannelIdentity, TimelineSource } from './channel';
import { contactDisplayName } from '@/lib/utils';

// ============= WhatsApp Instance Types (Sprint 012) =============
export * from './whatsappInstance';

// ============= Legacy Types (for backward compatibility) =============
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio'
}

export enum MessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'agent' | 'admin';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  status: 'active' | 'invited' | 'disabled';
  avatar: string;
  lastActive?: string;
  team_id?: string | null;
  user_id?: string | null;
  team?: Team;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  direction: MessageDirection;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: string[];
  messages: Message[];
}

// Metadata for AI-created appointments
export interface AppointmentMetadata {
  source?: 'nina_ai' | 'manual';
  conversation_id?: string;
  created_at_conversation?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'contact' | 'lead' | 'customer' | 'churned';
  lastContact: string;
}

export interface StatMetric {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: 'demo' | 'meeting' | 'support' | 'followup';
  description?: string;
  attendees?: string[];
  contact_id?: string;
  contact?: {
    id: string;
    name: string | null;
    phone_number: string;
  };
  metadata?: AppointmentMetadata;
  user_id?: string;
  /** 'scheduled' (default) | 'completed' (realizado) | 'cancelled' (excluído — soft delete, never listed). */
  status?: string;
}

export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: string;
  stageId?: string; // New: reference to pipeline_stages
  ownerAvatar: string;
  ownerId?: string;
  ownerName?: string;
  tags: string[];
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  wonAt?: string;
  lostAt?: string;
  lostReason?: string;
  clientMemory?: ClientMemory;
  conversationId?: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task';
  title: string;
  description?: string;
  scheduledAt?: string;
  completedAt?: string;
  isCompleted: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  position: number;
  isSystem: boolean;
  isActive: boolean;
  isAiManaged: boolean;
  aiTriggerCriteria: string | null;
}


export interface TagDefinition {
  id: string;
  key: string;
  label: string;
  color: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============= Database Types (Real Supabase Schema) =============
export type ConversationStatus = 'nina' | 'human' | 'paused';
export type MessageFromType = 'user' | 'nina' | 'human';
export type DBMessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'processing';
export type DBMessageType = 'text' | 'audio' | 'image' | 'document' | 'video';

export interface ClientMemory {
  last_updated: string | null;
  lead_profile: {
    interests: string[];
    lead_stage: string;
    objections: string[];
    products_discussed: string[];
    communication_style: string;
    qualification_score: number;
  };
  sales_intelligence: {
    pain_points: string[];
    next_best_action: string;
    budget_indication: string;
    decision_timeline: string;
  };
  interaction_summary: {
    response_pattern: string;
    last_contact_reason: string;
    total_conversations: number;
    preferred_contact_time: string;
  };
  conversation_history: Array<{
    timestamp: string;
    user_summary: string;
    ai_action: string;
  }>;
}

// ============= Lead origin, campaigns & outcome =============

/** How a lead reached us. Coarser than `ChannelType` on purpose: the question is
 *  "was this paid media, our site, organic, or a referral", not which app. */
export type LeadSourceKind =
  | 'paid_ad'
  | 'website'
  | 'direct_social'
  | 'organic'
  | 'referral'
  | 'offline'
  | 'unknown';

export const LEAD_SOURCE_KIND_LABEL: Record<LeadSourceKind, string> = {
  paid_ad: 'Anúncio pago',
  website: 'Site',
  direct_social: 'Direct / rede social',
  organic: 'Orgânico',
  referral: 'Indicação',
  offline: 'Offline',
  unknown: 'Não identificado',
};

/** The signals that identify a campaign, as a mapping rule can match them. */
export type CampaignMatchType =
  | 'meta_ad_id'
  | 'meta_campaign_name'
  | 'utm_campaign'
  | 'ref_token'
  | 'whatsapp_instance';

export const CAMPAIGN_MATCH_TYPE_LABEL: Record<CampaignMatchType, string> = {
  meta_ad_id: 'ID do anúncio (Meta)',
  meta_campaign_name: 'Nome da campanha (Meta)',
  utm_campaign: 'utm_campaign',
  ref_token: 'Token [ref:] do site',
  whatsapp_instance: 'Número de WhatsApp',
};

export interface Campaign {
  id: string;
  name: string;
  channel: string | null;
  startedAt: string | null;
  endedAt: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface CampaignMapping {
  id: string;
  campaignId: string;
  matchType: CampaignMatchType;
  matchValue: string;
  priority: number;
}

/** A contact's first-touch origin with its campaign already resolved by the
 *  `lead_attribution_resolved` view. */
export interface LeadAttribution {
  contactId: string;
  sourceChannel: string;
  sourceKind: LeadSourceKind;
  sourceRaw: Record<string, string>;
  setManually: boolean;
  firstSeenAt: string;
  campaignId: string | null;
  campaignName: string | null;
  /** The raw value that identifies a campaign, mapped or not — drives the
   *  "unmapped signals" list on the campaigns admin page. */
  rawCampaignSignal: string | null;
}

export interface LossReason {
  key: string;
  label: string;
  position: number;
}

export interface DBContact {
  id: string;
  /** Null for channels that have no phone number (Instagram/Messenger). */
  phone_number: string | null;
  /** Identity within `channel`: phone digits (whatsapp), PSID (facebook), IGSID (instagram). */
  external_id: string;
  channel: ChannelType;
  whatsapp_id: string | null;
  name: string | null;
  call_name: string | null;
  email: string | null;
  profile_picture_url: string | null;
  tags: string[];
  notes: string | null;
  is_business: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  client_memory: ClientMemory;
  first_contact_date: string;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface DBConversation {
  id: string;
  contact_id: string;
  status: ConversationStatus;
  is_active: boolean;
  /** Set while the conversation is archived (hidden from the main queue). */
  archived_at: string | null;
  channel: ChannelType;
  provider: string | null;
  assigned_user_id: string | null;
  assigned_at: string | null;
  assigned_team: string | null;
  tags: string[];
  metadata: Record<string, any>;
  nina_context: Record<string, any>;
  started_at: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: DBContact;
  messages?: DBMessage[];
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  channel: ChannelType;
  whatsapp_message_id: string | null;
  content: string | null;
  type: DBMessageType;
  from_type: MessageFromType;
  /** Which operator typed this message (`from_type = 'human'` only). */
  sent_by: string | null;
  status: DBMessageStatus;
  media_url: string | null;
  media_type: string | null;
  reply_to_id: string | null;
  processed_by_nina: boolean;
  nina_response_time: number | null;
  metadata: Record<string, any>;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

// ============= Transformed Types for UI =============
export interface UIConversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  contactEmail: string | null;
  status: ConversationStatus;
  isActive: boolean;
  /** Archived conversations leave the main queue and live under "Arquivadas";
   *  a new inbound message unarchives them (DB trigger). */
  isArchived: boolean;
  assignedTeam: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  tags: string[];
  messages: UIMessage[];
  clientMemory: ClientMemory;
  notes: string | null;
  /** Predominant/most-recent channel for this thread. A conversation can
   *  transit multiple channels over its lifetime (e.g. WhatsApp -> Instagram
   *  -> Webchat -> WhatsApp) while remaining a single unified thread — see
   *  UIMessage.channel for the per-message channel. */
  primaryChannel: ChannelType;
  /** Evolution instance (WhatsApp number) that owns this conversation — used to
   *  filter the queue when several numbers run at once. From conversations.metadata.instance. */
  instance?: string;
  /** True for WhatsApp group threads — the timeline then labels each incoming
   *  message with its sender. From conversations.metadata.isGroup. */
  isGroup?: boolean;
}

export interface UIMessage {
  id: string;
  content: string;
  timestamp: string;
  /** Raw ISO send time (`messages.sent_at`) — for durations like "waiting for 2h". */
  sentAt?: string;
  direction: MessageDirection;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read';
  fromType: MessageFromType;
  mediaUrl: string | null;
  whatsappMessageId: string | null;
  /** Channel this specific message arrived/was sent through. */
  channel?: ChannelType;
  /** Operator who typed this message (`fromType === 'human'` only) — the basis
   *  for per-attendant supervision metrics. Null for AI and inbound messages. */
  sentBy?: string | null;
  /** Group only: who sent this incoming message (from messages.metadata.sender). */
  senderName?: string | null;
  senderPhone?: string | null;
  /** `messages.id` this message replies to (WhatsApp "responder"). */
  replyToId?: string | null;
}

// ============= Utility Functions =============
export function transformDBToUIConversation(
  conv: DBConversation,
  messages: DBMessage[]
): UIConversation {
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  const lastMsg = sortedMessages[sortedMessages.length - 1];
  const unreadCount = messages.filter(
    m => m.from_type === 'user' && m.status !== 'read'
  ).length;

  return {
    id: conv.id,
    contactId: conv.contact_id,
    contactName: contactDisplayName(conv.contact?.name || conv.contact?.call_name, conv.contact?.phone_number, 'Desconhecido'),
    contactPhone: conv.contact?.phone_number || '',
    contactAvatar: conv.contact?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact?.name || 'U')}&background=0ea5e9&color=fff`,
    contactEmail: conv.contact?.email || null,
    status: conv.status,
    isActive: conv.is_active,
    isArchived: !!conv.archived_at,
    assignedTeam: conv.assigned_team,
    assignedUserId: conv.assigned_user_id,
    assignedUserName: null, // Will be populated if needed
    lastMessage: lastMsg?.content || '',
    lastMessageTime: formatRelativeTime(conv.last_message_at),
    unreadCount,
    tags: [...(conv.tags || []), ...(conv.contact?.tags || [])],
    messages: sortedMessages.map(transformDBToUIMessage),
    clientMemory: conv.contact?.client_memory || getDefaultClientMemory(),
    notes: conv.contact?.notes || null,
    primaryChannel: conv.channel ?? 'whatsapp',
    instance: (conv.metadata as { instance?: string } | null)?.instance,
    isGroup: (conv.metadata as { isGroup?: boolean } | null)?.isGroup
      ?? conv.contact?.phone_number?.endsWith('@g.us')
      ?? false,
  };
}

export function transformDBToUIMessage(msg: DBMessage): UIMessage {
  return {
    id: msg.id,
    content: msg.content || '',
    timestamp: formatMessageTime(msg.sent_at),
    sentAt: msg.sent_at,
    direction: msg.from_type === 'user' ? MessageDirection.INCOMING : MessageDirection.OUTGOING,
    type: mapDBMessageType(msg.type),
    status: mapDBMessageStatus(msg.status),
    fromType: msg.from_type,
    mediaUrl: msg.media_url,
    whatsappMessageId: msg.whatsapp_message_id,
    channel: msg.channel ?? 'whatsapp',
    sentBy: msg.sent_by ?? null,
    senderName: (msg.metadata as { sender?: { name?: string | null } } | null)?.sender?.name ?? null,
    senderPhone: (msg.metadata as { sender?: { phone?: string | null } } | null)?.sender?.phone ?? null,
    replyToId: msg.reply_to_id ?? null,
  };
}

function mapDBMessageType(type: DBMessageType): MessageType {
  switch (type) {
    case 'image': return MessageType.IMAGE;
    case 'audio': return MessageType.AUDIO;
    default: return MessageType.TEXT;
  }
}

function mapDBMessageStatus(status: DBMessageStatus): 'sent' | 'delivered' | 'read' {
  switch (status) {
    case 'read': return 'read';
    case 'delivered': return 'delivered';
    default: return 'sent';
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============= CRM Types (Sprint 007) =============

export interface Person {
  id: string;
  name: string;
  company?: string;
  companyId?: string;
  document?: string;
  email: string;
  phones: string[];
  whatsapp: string;
  city?: string;
  state?: string;
  ownerId?: string;
  ownerName?: string;
  origin?: string;
  tags: string[];
  notes?: string;
  status: 'lead' | 'customer' | 'churned';
  createdAt: string;
  updatedAt: string;
  /** Known messaging-channel identities for this person, used to resolve
   *  inbound events from any channel to this same unique customer record
   *  (never create a duplicate Person for a channel already linked here). */
  channelIdentities?: ChannelIdentity[];
}

export interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  segmento?: string;
  porte?: 'mei' | 'pequena' | 'media' | 'grande' | 'enterprise';
  city?: string;
  state?: string;
  ownerId?: string;
  ownerName?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  contactIds?: string[];
  dealIds?: string[];
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskOrigin = 'conversation' | 'deal' | 'person';

export interface Task {
  id: string;
  title: string;
  description?: string;
  ownerId?: string;
  ownerName?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  origin: TaskOrigin;
  originId: string;
  personId?: string;
  personName?: string;
  dealId?: string;
  dealTitle?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

/** Real task row (public.tasks) — a to-do assigned to an attendant for a contact. */
export interface ContactTask {
  id: string;
  title: string;
  status: 'pending' | 'done';
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
}

/** A task of the logged-in attendant — assigned to them, or created by them for someone else. */
export interface MyTask extends ContactTask {
  /** False for a task the attendant delegated (or left without an assignee). */
  assignedToMe: boolean;
  contactId: string | null;
  contactName: string;
  /** Who created it — "você" when it's the attendant themself. */
  createdByName: string | null;
  updatedAt: string;
}

/** A task with a due date, as the Agenda shows it (all-day, colored by assignee). */
export interface ScheduledTask {
  id: string;
  title: string;
  status: 'pending' | 'done';
  dueDate: string;
  /** auth user id of the assignee — the Agenda colors people by it. */
  assigneeUserId?: string;
  assigneeName?: string;
  contactName: string;
}

export type TimelineEntryType =
  | 'message'
  | 'note'
  | 'stage_change'
  | 'return'
  | 'task'
  | 'ai_action'
  | 'transfer'
  | 'important_change';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  content: string;
  metadata?: Record<string, any>;
  personId?: string;
  dealId?: string;
  conversationId?: string;
  taskId?: string;
  createdByType: 'human' | 'nina' | 'system';
  createdByName?: string;
  createdAt: string;
  /** Messaging channel this entry relates to, when applicable (e.g. type === 'message'). */
  channel?: ChannelType;
  /** Origin of the action — structural prep for AI/Automation sprints. */
  source?: TimelineSource;
}

export interface AIIntegrationPoint {
  type: 'conversation_summary' | 'next_steps' | 'intent_detection' | 'deal_suggestion' | 'task_suggestion' | 'followup_recommendation';
  status: 'pending' | 'ready';
  data?: Record<string, any>;
}

function getDefaultClientMemory(): ClientMemory {
  return {
    last_updated: null,
    lead_profile: {
      interests: [],
      lead_stage: 'new',
      objections: [],
      products_discussed: [],
      communication_style: 'unknown',
      qualification_score: 0
    },
    sales_intelligence: {
      pain_points: [],
      next_best_action: 'qualify',
      budget_indication: 'unknown',
      decision_timeline: 'unknown'
    },
    interaction_summary: {
      response_pattern: 'unknown',
      last_contact_reason: '',
      total_conversations: 0,
      preferred_contact_time: 'unknown'
    },
    conversation_history: []
  };
}
