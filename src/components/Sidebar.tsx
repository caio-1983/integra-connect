import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import {
  SidebarHeader,
  SidebarNavigation,
  SidebarFooter,
} from '@/components/sidebar-v2';
import { GlobalSearch } from '@/components/crm/GlobalSearch';

/**
 * Sidebar V2 — componente oficial do Design System do Integra Connect.
 *
 * Composição (tema claro, UI-001):
 *   SidebarHeader     → logo do cliente + identidade do produto + empresa
 *   GlobalSearch      → busca global Ctrl+K (Sprint 007)
 *   SidebarNavigation → navegação global por domínio de negócio
 *   SidebarFooter     → usuário autenticado
 *
 * Responsável exclusivamente pela navegação global. Não altera rotas,
 * regras de negócio, autenticação, estado global ou APIs.
 */
const AppSidebar: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between border-r border-slate-200 bg-white">
          <div className="flex flex-1 flex-col gap-1 overflow-hidden">
            <SidebarHeader />

            <SidebarNavigation />
          </div>
          <SidebarFooter />
        </SidebarBody>
      </Sidebar>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default AppSidebar;
