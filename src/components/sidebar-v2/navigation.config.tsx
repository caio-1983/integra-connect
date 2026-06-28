import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings as SettingsIcon,
  ShieldCheck,
  Calendar,
  Kanban,
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
  /** Nome do domínio de negócio (ex.: "Atendimento"). */
  title: string;
  /** Itens pertencentes ao domínio. */
  items: SidebarItemConfig[];
}

/**
 * Navegação global organizada por domínio de negócio.
 *
 * Ordem e nomenclatura seguem a "Estrutura Principal" do Handbook:
 * Operações, Atendimento, Clientes, Comercial, Analytics, Administração.
 *
 * Mapeamento domínio → rota existente:
 *   Operações     → /scheduling  (Agenda / Compromissos operacionais)
 *   Atendimento   → /chat        (Conversas em tempo real)
 *   Clientes      → /contacts    (Cadastro e relacionamento)
 *   Comercial     → /pipeline    (Oportunidades e pipeline)
 *   Analytics     → /dashboard   (Indicadores e visão geral)
 *   Administração → /team, /settings (Equipe e configurações)
 */
export const sidebarNavigation: SidebarSectionConfig[] = [
  {
    id: 'operacoes',
    title: 'Operações',
    items: [
      { id: 'scheduling', label: 'Operações', href: '/scheduling', icon: Calendar },
    ],
  },
  {
    id: 'atendimento',
    title: 'Atendimento',
    items: [
      { id: 'chat', label: 'Conversas', href: '/chat', icon: MessageSquare },
    ],
  },
  {
    id: 'clientes',
    title: 'Clientes',
    items: [
      { id: 'contacts', label: 'Contatos', href: '/contacts', icon: Users },
    ],
  },
  {
    id: 'comercial',
    title: 'Comercial',
    items: [
      { id: 'pipeline', label: 'Comercial', href: '/pipeline', icon: Kanban },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    items: [
      { id: 'dashboard', label: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'administracao',
    title: 'Administração',
    items: [
      { id: 'team', label: 'Equipe', href: '/team', icon: ShieldCheck },
      { id: 'settings', label: 'Configurações', href: '/settings', icon: SettingsIcon },
    ],
  },
];
