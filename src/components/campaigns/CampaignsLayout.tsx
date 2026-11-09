import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageContainer, PageHeader, Toolbar } from '@/components/layout';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/**
 * Shell for "Campanhas": the scoreboard (is each ad worth keeping?) and the
 * names for origins without an ad, as tabs of one page.
 */

// "Desempenho" compara atendentes: só admin/gestor (rota atrás de RoleRoute).
const TABS = [
  { to: '/campanhas', label: 'Desempenho', managerOnly: true },
  { to: '/campanhas/configurar', label: 'Origens sem anúncio', managerOnly: false },
];

export const CampaignsLayout: React.FC = () => {
  const { canManageUsers } = useCompanySettings();
  const tabs = TABS.filter((tab) => !tab.managerOnly || canManageUsers);

  return (
    <PageContainer>
      <PageHeader
        title="Anúncios"
        description="Quem chamou por cada anúncio, quem fechou negócio e quais valem a pena manter."
      />

      <Toolbar>
        <nav className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border" aria-label="Seções de anúncios">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/campanhas'}
              className={({ isActive }) =>
                `px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </Toolbar>

      <Outlet />
    </PageContainer>
  );
};

export default CampaignsLayout;
