import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { PERIOD_PRESETS, resolvePeriod, type Period, type PeriodPreset } from '@/services/analyticsService';
import { cn } from '@/lib/utils';

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
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-3">
        <PageHeader
          title="Resultados"
          description={`${period.label.charAt(0).toUpperCase()}${period.label.slice(1)}, comparado com o período anterior.`}
          className="mb-1"
          actions={
            <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
              <SelectTrigger className="h-9 w-44 rounded-full bg-card" aria-label="Período">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Tabs as WhatsApp filter chips. */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Seções de resultados">
          {visibleTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/dashboard'}
              className={({ isActive }) => cn(
                'flex-shrink-0 px-4 h-8 rounded-full text-sm flex items-center whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border',
              )}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet context={{ period } satisfies ResultsContext} />
      </div>
    </PageContainer>
  );
};

export default ResultsLayout;
