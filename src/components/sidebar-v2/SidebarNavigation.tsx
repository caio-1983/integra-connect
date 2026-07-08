import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarSection } from './SidebarSection';
import { sidebarNavigation } from './navigation.config';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { isModuleEnabled } from '@/lib/platformPhase';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/**
 * Navegação global da plataforma.
 *
 * Renderiza as seções por domínio de negócio definidas em
 * `navigation.config`. Responsável exclusivamente pela navegação global —
 * nunca concentra ações de um módulo (architecture/04-navegacao.md).
 */
export const SidebarNavigation: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname;
  const unreadCount = useUnreadMessagesCount();
  const badges = { chat: unreadCount };
  const { canManageUsers } = useCompanySettings();

  const visibleSections = sidebarNavigation
    .filter((section) => isModuleEnabled(section.id))
    .map((section) => ({
      ...section,
      // "Usuários" (gestão de equipe) é só pra quem pode gerenciar usuários (admin/gestor).
      items: section.items.filter((item) => item.id !== 'team' || canManageUsers),
    }));

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
      {visibleSections.map((section) => (
        <SidebarSection key={section.id} section={section} currentPath={currentPath} badges={badges} />
      ))}
    </div>
  );
};
