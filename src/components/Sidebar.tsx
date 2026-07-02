import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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
 *   SidebarFooter     → assinatura da plataforma + usuário
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

            {/* Busca Global — Sprint 007 */}
            <div className="px-2 pb-1">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-sm group"
                title="Busca Global (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0" />
                {open && (
                  <>
                    <span className="flex-1 text-xs text-left">Buscar...</span>
                    <kbd className="hidden group-hover:inline-flex h-4 items-center rounded border border-slate-200 px-1 text-[10px] font-mono text-slate-400">
                      ⌘K
                    </kbd>
                  </>
                )}
              </button>
            </div>

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
