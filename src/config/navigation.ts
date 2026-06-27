import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  ShieldCheck,
  Calendar,
  Kanban,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pipeline', label: 'Pipeline', icon: Kanban },
      { id: 'chat', label: 'Chat Ao Vivo', icon: MessageSquare },
      { id: 'contacts', label: 'Contatos', icon: Users },
      { id: 'scheduling', label: 'Agendamentos', icon: Calendar },
      { id: 'team', label: 'Equipe', icon: ShieldCheck },
      { id: 'settings', label: 'Configurações', icon: Settings },
    ],
  },
];

export const menuItems: NavItem[] = navigation.flatMap(section => section.items);
