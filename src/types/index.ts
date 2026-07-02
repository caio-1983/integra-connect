// ============= Channel Types (Sprint 008) =============
export * from './channel';
import type { ChannelType, ChannelIdentity, TimelineSource } from './channel';

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
  function_id?: string | null;
  weight?: number;
  team?: Team;
  function?: TeamFunction;
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

export interface TeamFunction {
  id: string;
  name: string;
  description: string | null;
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
  status: 'lead' | 'customer' | 'churned';
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

export interface DBContact {
  id: string;
  phone_number: string;
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
  assigned_user_id: string | null;
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
  whatsapp_message_id: string | null;
  content: string | null;
  type: DBMessageType;
  from_type: MessageFromType;
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
}

export interface UIMessage {
  id: string;
  content: string;
  timestamp: string;
  direction: MessageDirection;
  type: MessageType;
  status: 'sent' | 'delivered' | 'read';
  fromType: MessageFromType;
  mediaUrl: string | null;
  whatsappMessageId: string | null;
  /** Channel this specific message arrived/was sent through. */
  channel?: ChannelType;
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
    contactName: conv.contact?.name || conv.contact?.call_name || conv.contact?.phone_number || 'Desconhecido',
    contactPhone: conv.contact?.phone_number || '',
    contactAvatar: conv.contact?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact?.name || 'U')}&background=0ea5e9&color=fff`,
    contactEmail: conv.contact?.email || null,
    status: conv.status,
    isActive: conv.is_active,
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
    primaryChannel: 'whatsapp',
  };
}

export function transformDBToUIMessage(msg: DBMessage): UIMessage {
  return {
    id: msg.id,
    content: msg.content || '',
    timestamp: formatMessageTime(msg.sent_at),
    direction: msg.from_type === 'user' ? MessageDirection.INCOMING : MessageDirection.OUTGOING,
    type: mapDBMessageType(msg.type),
    status: mapDBMessageStatus(msg.status),
    fromType: msg.from_type,
    mediaUrl: msg.media_url,
    whatsappMessageId: msg.whatsapp_message_id,
    channel: 'whatsapp',
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
