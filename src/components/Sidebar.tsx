import React, { useState } from 'react';
import { Sidebar, SidebarBody } from '@/components/ui/sidebar';
import {
  SidebarHeader,
  SidebarNavigation,
  SidebarFooter,
} from '@/components/sidebar-v2';

/**
 * Sidebar V2 — componente oficial do Design System do Integra Connect.
 *
 * Composição (tema claro, UI-001):
 *   SidebarHeader     → logo do cliente + identidade do produto + empresa
 *   SidebarNavigation → navegação global por domínio de negócio
 *   SidebarFooter     → assinatura da plataforma + usuário
 *
 * Responsável exclusivamente pela navegação global. Não altera rotas,
 * regras de negócio, autenticação, estado global ou APIs.
 */
const AppSidebar: React.FC = () => {
  const [open, setOpen] = useState(true);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between border-r border-slate-200 bg-white">
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          <SidebarHeader />
          <SidebarNavigation />
        </div>
        <SidebarFooter />
      </SidebarBody>
    </Sidebar>
  );
};

export default AppSidebar;
