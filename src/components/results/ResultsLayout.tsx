import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { PageContainer, PageHeader, Toolbar } from '@/components/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { PERIOD_PRESETS, resolvePeriod, type Period, type PeriodPreset } from '@/services/analyticsService';

/**
 * Shell for the "Resultados" surface: one period selector shared by every tab.
 *
 * The period lives here rather than per-tab so switching from Campanhas to Perdas
 * keeps the same window — comparing a campaign's drop against a loss breakdown
 * from a different month would be actively misleading.
 */

export interface ResultsContext {
  period: Period;
}

export function useResultsPeriod(): Period {
  return useOutletContext<ResultsContext>().period;
}

interface TabDef {
  to: string;
  label: string;
  /** Comparing attendants against each other is a manager's view, not an
   *  attendant's — this tab is hidden (and route-guarded) for agents. */
  managerOnly?: boolean;
}

const TABS: TabDef[] = [
  { to: '/dashboard', label: 'Visão geral' },
  { to: '/dashboard/campanhas', label: 'Campanhas' },
  { to: '/dashboard/origem', label: 'Origem' },
  { to: '/dashboard/perdas', label: 'Perdas' },
  { to: '/dashboard/atendimento', label: 'Atendimento', managerOnly: true },
];

export const ResultsLayout: React.FC = () => {
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const { canManageUsers } = useCompanySettings();

  // Resolved once per preset change so every tab in a render pass shares the
  // exact same boundaries (`new Date()` on each tab would drift).
  const period = useMemo(() => resolvePeriod(preset), [preset]);
  const visibleTabs = TABS.filter((tab) => !tab.managerOnly || canManageUsers);

  return (
    <PageContainer>
      <PageHeader
        title="Resultados"
        description={`Faturamento, origem dos leads, perdas e atendimento em ${period.label}, comparados com o período anterior.`}
      />

      <Toolbar>
        <nav className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border" aria-label="Seções de resultados">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/dashboard'}
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

        <div className="ml-auto">
          <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="h-9 w-40" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Toolbar>

      <Outlet context={{ period } satisfies ResultsContext} />
    </PageContainer>
  );
};

export default ResultsLayout;
