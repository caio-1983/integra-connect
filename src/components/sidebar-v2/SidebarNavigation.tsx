import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarSection } from './SidebarSection';
import { sidebarNavigation } from './navigation.config';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { isModuleEnabled } from '@/lib/platformPhase';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { isDevPreviewFeature, useIsDevPreviewUser } from '@/lib/devPreview';

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
  const devPreviewUser = useIsDevPreviewUser();

  // Itens cuja rota está atrás de RoleRoute (admin/gestor). Mostrá-los para um
  // atendente renderiza um link que só o joga de volta em /operations, então a
  // lista precisa acompanhar as rotas guardadas em App.tsx. Campanhas fica
  // visível: o atendente cai em /campanhas/configurar, que é aberta.
  const MANAGER_ONLY_ITEMS = new Set(['team']);

  const visibleSections = sidebarNavigation
    .filter((section) => isModuleEnabled(section.id))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        (!MANAGER_ONLY_ITEMS.has(item.id) || canManageUsers) &&
        (!isDevPreviewFeature(item.id) || devPreviewUser)),
    }));

  // Subpáginas (/campanhas/configurar) marcam o item pai; vence o href mais
  // longo para /settings/channels ficar em Conexões e não em Configurações.
  const activeHref = visibleSections
    .flatMap((section) => section.items.map((item) => item.href))
    .filter((href) => currentPath === href || currentPath.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
      {visibleSections.map((section) => (
        <SidebarSection key={section.id} section={section} activeHref={activeHref} badges={badges} />
      ))}
    </div>
  );
};
