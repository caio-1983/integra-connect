import { Contact, Conversation, MessageDirection, MessageType, StatMetric, TeamMember, Appointment, Deal, KanbanColumn } from "./types";
import {
  MOCK_TEAM_EXTENDED,
  MOCK_CONTACTS_EXTENDED,
  MOCK_DEALS_EXTENDED,
  MOCK_APPOINTMENTS_EXTENDED,
  MOCK_PEOPLE,
  MOCK_COMPANIES,
  MOCK_TASKS,
  MOCK_TIMELINE_ENTRIES,
} from './lib/mockData';

export const STATS: StatMetric[] = [
  { label: 'Atendimentos Hoje', value: '142', trend: '+12%', trendUp: true },
  { label: 'Vendas Convertidas', value: 'R$ 4.250', trend: '+5%', trendUp: true },
  { label: 'Tempo Médio (TMA)', value: '4m 12s', trend: '-2%', trendUp: true }, // Down is good for TMA
  { label: 'Novos Leads', value: '28', trend: '-5%', trendUp: false },
];

export const MOCK_TEAM: TeamMember[] = MOCK_TEAM_EXTENDED;

export const MOCK_CONTACTS: Contact[] = MOCK_CONTACTS_EXTENDED;

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    contactName: 'Carlos Souza',
    contactPhone: '+55 11 99999-0002',
    contactAvatar: 'https://picsum.photos/seed/carlos/200/200',
    lastMessage: 'Qual o valor do plano Enterprise?',
    lastMessageTime: '10:46',
    unreadCount: 2,
    tags: ['Interessado', 'SaaS'],
    messages: [
      { id: 'm1', content: 'Olá, bom dia! Gostaria de saber mais sobre a automação.', timestamp: '10:30', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Bom dia Carlos! Claro, como posso ajudar?', timestamp: '10:32', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Qual o valor do plano Enterprise?', timestamp: '10:42', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'delivered' },
      { id: 'm4', content: 'Seguem os comparativos visuais que solicitou.', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm5', content: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop', timestamp: '10:44', direction: MessageDirection.OUTGOING, type: MessageType.IMAGE, status: 'read' },
      { id: 'm6', content: 'Audio Message', timestamp: '10:46', direction: MessageDirection.INCOMING, type: MessageType.AUDIO, status: 'delivered' },
    ]
  },
  {
    id: 'c2',
    contactName: 'Ana Silva',
    contactPhone: '+55 11 99999-0001',
    contactAvatar: 'https://picsum.photos/seed/ana/200/200',
    lastMessage: 'Obrigada pelo suporte!',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Cliente', 'Suporte'],
    messages: [
      { id: 'm1', content: 'Meu acesso foi restabelecido.', timestamp: '14:20', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Que ótima notícia, Ana! Precisando é só chamar.', timestamp: '14:25', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm3', content: 'Obrigada pelo suporte!', timestamp: '14:26', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  },
  {
    id: 'c3',
    contactName: 'João Pereira',
    contactPhone: '+55 11 99999-0004',
    contactAvatar: 'https://picsum.photos/seed/joao/200/200',
    lastMessage: 'Vou verificar com meu sócio.',
    lastMessageTime: 'Ontem',
    unreadCount: 0,
    tags: ['Negociação'],
    messages: [
      { id: 'm1', content: 'Conseguimos fazer por R$ 200/mês no anual.', timestamp: '16:00', direction: MessageDirection.OUTGOING, type: MessageType.TEXT, status: 'read' },
      { id: 'm2', content: 'Vou verificar com meu sócio.', timestamp: '16:15', direction: MessageDirection.INCOMING, type: MessageType.TEXT, status: 'read' },
    ]
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = MOCK_APPOINTMENTS_EXTENDED;

export const MOCK_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'Novos Leads', color: 'border-slate-500', position: 0, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'qualification', title: 'Qualificação', color: 'border-cyan-500', position: 1, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'presentation', title: 'Apresentação', color: 'border-violet-500', position: 2, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'negotiation', title: 'Negociação', color: 'border-orange-500', position: 3, isSystem: false, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'won', title: 'Fechado / Ganho', color: 'border-emerald-500', position: 4, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
  { id: 'lost', title: 'Perdido', color: 'border-red-500', position: 5, isSystem: true, isActive: true, isAiManaged: false, aiTriggerCriteria: null },
];

export const MOCK_DEALS: Deal[] = MOCK_DEALS_EXTENDED;

// CRM — Sprint 007
export { MOCK_PEOPLE, MOCK_COMPANIES, MOCK_TASKS, MOCK_TIMELINE_ENTRIES };
