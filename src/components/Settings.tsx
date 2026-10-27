import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/layout';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { QuickRepliesSettings } from '@/components/settings/QuickRepliesSettings';
import { PixSettings } from '@/components/settings/PixSettings';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { ROLE_LABEL } from '@/components/team/teamLabels';
import { cn } from '@/lib/utils';

/**
 * Configurações reúne o que antes eram três itens do menu (Configurações,
 * Usuários e Conexões) como abas de uma página só, uma URL por aba.
 */

// "Usuários" é só admin/gestor (rota atrás de RoleRoute).
const TABS = [
  { to: '/settings', label: 'Respostas rápidas', managerOnly: false },
  { to: '/settings/aparencia', label: 'Aparência', managerOnly: false },
  { to: '/settings/usuarios', label: 'Usuários', managerOnly: true },
  { to: '/settings/conexoes', label: 'Conexões', managerOnly: false },
  { to: '/settings/pagamentos', label: 'Pagamentos', managerOnly: false },
];

const Settings: React.FC = () => {
  const { companyName, role, canManageUsers } = useCompanySettings();
  const tabs = TABS.filter((tab) => !tab.managerOnly || canManageUsers);

  return (
    <PageContainer>
      {/* Same centred reading column as Contatos; the header and tabs align with it. */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
        <PageHeader
          title="Configurações"
          description={companyName}
          className="mb-0"
          actions={role && (
            <span className="px-3 h-7 rounded-full bg-card border border-border text-muted-foreground text-xs font-medium flex items-center">
              {ROLE_LABEL[role]}
            </span>
          )}
        />

        <nav
          aria-label="Seções de configurações"
          className="flex items-center gap-1 overflow-x-auto border-b border-border mb-3 -mx-1 px-1"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/settings'}
              className={({ isActive }) => cn(
                'relative flex-shrink-0 px-3 h-10 flex items-center text-sm whitespace-nowrap transition-colors rounded-t-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'text-primary font-medium after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-full after:bg-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </PageContainer>
  );
};

export const QuickRepliesTab: React.FC = () => <QuickRepliesSettings />;
export const AppearanceTab: React.FC = () => <AppearanceSettings />;
export const PaymentsTab: React.FC = () => <PixSettings />;

export default Settings;
