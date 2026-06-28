import React, { useState } from 'react';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import {
  SidebarHeader,
  SidebarNavigation,
  SidebarFooter,
} from '@/components/sidebar-v2';

/**
 * Sidebar V2 — primeiro componente oficial do Design System.
 *
 * Composição (tema claro):
 *   SidebarHeader     → identidade do produto + empresa como contexto
 *   SidebarNavigation → navegação global por domínio de negócio
 *   SidebarFooter     → usuário, cargo e logout
 *
 * Responsável exclusivamente pela navegação global. Não altera rotas,
 * regras de negócio, autenticação, estado global ou APIs.
 */
const AppSidebar: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between border-r border-slate-100 bg-white">
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <SidebarHeader />
          <SidebarNavigation />
        </div>
        <SidebarFooter />
      </SidebarBody>
    </Sidebar>
  );
};

export default AppSidebar;
