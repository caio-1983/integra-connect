import {
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Briefcase,
  TrendingUp,
  Building2,
  CalendarDays,
  UserRound,
  UsersRound,
  Landmark,
  HandCoins,
  CheckSquare,
  Radio,
  Globe,
  Bot,
  BookOpen,
  Wrench,
  FlaskConical,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

/**
 * Item de navegação global da Sidebar.
 *
 * IMPORTANTE: `href` mapeia 1:1 para as rotas existentes em App.tsx.
 * Nenhuma rota é criada, removida ou alterada nesta organização — apenas
 * agrupada por domínio de negócio conforme o Product Handbook
 * (architecture/04-navegacao.md e architecture/02-modulos.md).
 */
export interface SidebarItemConfig {
  /** Identificador estável do item. */
  id: string;
  /** Rótulo orientado ao negócio exibido no menu. */
  label: string;
  /** Rota existente. Não deve ser alterada. */
  href: string;
  /** Ícone Lucide React, padrão do Design System. */
  icon: LucideIcon;
}

/**
 * Seção da navegação representando um domínio de negócio.
 * Cada seção corresponde a um módulo do Handbook.
 */
export interface SidebarSectionConfig {
  /** Identificador estável da seção. */
  id: string;
  /** Nome do domínio de negócio. Exibido em uppercase via CSS. */
  title: string;
  /** Itens pertencentes ao domínio. */
  items: SidebarItemConfig[];
}

/**
 * Navegação global organizada por domínio de negócio (UI-001).
 *
 * Estrutura: OPERAÇÃO → 5 módulos | ADMINISTRAÇÃO → Configurações.
 *
 * Renomeações aplicadas (sem alterar rotas):
 *   Agenda      → Operações   (/operations — Sprint 003)
 *   Conversas   → Atendimento (/chat)
 *   Painel      → Indicadores (/dashboard)
 *
 * Rota /scheduling mantida intacta para acesso direto ao módulo de agenda.
 */
export const sidebarNavigation: SidebarSectionConfig[] = [
  {
    id: 'operacao',
    title: 'Operação',
    items: [
      { id: 'operations', label: 'Operações',   href: '/operations', icon: Building2     },
      { id: 'chat',       label: 'Atendimento', href: '/chat',       icon: MessageSquare },
      { id: 'contacts',   label: 'Clientes',    href: '/contacts',   icon: Users         },
      { id: 'pipeline',   label: 'Comercial',   href: '/pipeline',   icon: Briefcase     },
      { id: 'scheduling', label: 'Agenda',       href: '/scheduling', icon: CalendarDays  },
      { id: 'dashboard',  label: 'Indicadores', href: '/dashboard',  icon: TrendingUp    },
    ],
  },
  {
    id: 'crm',
    title: 'CRM',
    items: [
      { id: 'crm-people',    label: 'Pessoas',   href: '/crm/people',    icon: UserRound   },
      { id: 'crm-companies', label: 'Empresas',  href: '/crm/companies', icon: Landmark    },
      { id: 'crm-deals',    label: 'Negócios',  href: '/crm/deals',     icon: HandCoins   },
      { id: 'crm-tasks',    label: 'Tarefas',   href: '/crm/tasks',     icon: CheckSquare },
    ],
  },
  {
    id: 'ia',
    title: 'IA',
    items: [
      { id: 'ia-agentes',           label: 'Agentes',              href: '/ia/agentes',              icon: Bot               },
      { id: 'ia-base-conhecimento', label: 'Base de Conhecimento', href: '/ia/base-de-conhecimento', icon: BookOpen          },
      { id: 'ia-ferramentas',       label: 'Ferramentas',          href: '/ia/ferramentas',          icon: Wrench            },
      { id: 'ia-testes',            label: 'Testes',                href: '/ia/testes',                icon: FlaskConical      },
      { id: 'ia-configuracoes',     label: 'Configurações',         href: '/ia/configuracoes',         icon: SlidersHorizontal },
    ],
  },
  {
    id: 'administracao',
    title: 'Administração',
    items: [
      { id: 'settings', label: 'Configurações', href: '/settings', icon: SettingsIcon },
      { id: 'team', label: 'Usuários', href: '/team', icon: UsersRound },
      { id: 'channels', label: 'Conexões', href: '/settings/channels', icon: Radio },
      { id: 'webchat-widget', label: 'Chat do Site', href: '/settings/webchat-widget', icon: Globe },
    ],
  },
];
