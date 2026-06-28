import {
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  Briefcase,
  TrendingUp,
  Building2,
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
 *   Agenda      → Operações   (/scheduling)
 *   Conversas   → Atendimento (/chat)
 *   Painel      → Indicadores (/dashboard)
 */
export const sidebarNavigation: SidebarSectionConfig[] = [
  {
    id: 'operacao',
    title: 'Operação',
    items: [
      { id: 'scheduling', label: 'Operações',   href: '/scheduling', icon: Building2     },
      { id: 'chat',       label: 'Atendimento', href: '/chat',       icon: MessageSquare },
      { id: 'contacts',   label: 'Clientes',    href: '/contacts',   icon: Users         },
      { id: 'pipeline',   label: 'Comercial',   href: '/pipeline',   icon: Briefcase     },
      { id: 'dashboard',  label: 'Indicadores', href: '/dashboard',  icon: TrendingUp    },
    ],
  },
  {
    id: 'administracao',
    title: 'Administração',
    items: [
      { id: 'settings', label: 'Configurações', href: '/settings', icon: SettingsIcon },
    ],
  },
];
