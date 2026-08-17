import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Users, Percent, Receipt, LineChart, TrendingUp } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { KPICard } from '@/components/ui/cards/KPICard';
import { api } from '@/services/api';
import { fetchRevenueKpis, formatPercentDelta, type KpiComparison } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { useResultsPeriod } from './ResultsLayout';

/**
 * Headline numbers, each against the previous window.
 *
 * "Receita ganha" is first and deliberately replaces the old "Conversões" tile,
 * which counted won deals plus appointments — a count that could rise while
 * revenue fell, which is exactly the blind spot the team described.
 */
export const ResultsOverview: React.FC = () => {
  const period = useResultsPeriod();
  const [kpis, setKpis] = useState<KpiComparison | null>(null);
  const [chartData, setChartData] = useState<{ name: string; chats: number; sales: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // The daily volume chart still comes from the existing api helper, which takes
    // a day count — derived from the selected window so the chart and the KPIs
    // describe the same period.
    const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000));

    Promise.all([fetchRevenueKpis(period), api.fetchChartData(days)])
      .then(([k, chart]) => {
        if (cancelled) return;
        setKpis(k);
        setChartData(chart as { name: string; chats: number; sales: number }[]);
      })
      .catch((error) => console.error('[results] Erro ao carregar visão geral:', error))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  const current = kpis?.current;
  const previous = kpis?.previous;

  return (
    <>
      <SectionBlock title="Indicadores do período" icon={TrendingUp}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Receita ganha"
            value={formatCurrency(current?.revenue)}
            subLabel={`${current?.wonCount ?? 0} negócio(s) fechado(s)`}
            trend={current && previous ? formatPercentDelta(current.revenue, previous.revenue) : undefined}
            trendUp={current && previous ? current.revenue >= previous.revenue : undefined}
            icon={CircleDollarSign}
            color="emerald"
            loading={loading}
          />
          <KPICard
            label="Leads novos"
            value={String(current?.newLeads ?? 0)}
            subLabel="primeiro contato no período"
            trend={current && previous ? formatPercentDelta(current.newLeads, previous.newLeads) : undefined}
            trendUp={current && previous ? current.newLeads >= previous.newLeads : undefined}
            icon={Users}
            color="cyan"
            loading={loading}
          />
          <KPICard
            label="Taxa de conversão"
            value={`${(current?.conversionRate ?? 0).toFixed(1)}%`}
            subLabel={`${current?.lostCount ?? 0} perdido(s)`}
            trend={current && previous ? formatPercentDelta(current.conversionRate, previous.conversionRate) : undefined}
            trendUp={current && previous ? current.conversionRate >= previous.conversionRate : undefined}
            icon={Percent}
            color="violet"
            loading={loading}
          />
          <KPICard
            label="Ticket médio"
            value={formatCurrency(current?.avgTicket)}
            subLabel="por negócio ganho"
            trend={current && previous ? formatPercentDelta(current.avgTicket, previous.avgTicket) : undefined}
            trendUp={current && previous ? current.avgTicket >= previous.avgTicket : undefined}
            icon={Receipt}
            color="amber"
            loading={loading}
          />
        </div>
      </SectionBlock>

      <SectionBlock
        title="Volume de atendimentos"
        icon={LineChart}
        description="Mensagens trocadas por dia no período."
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--chart-1))' }}
              />
              <Area
                type="monotone"
                dataKey="chats"
                name="Mensagens"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorChats)"
                activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionBlock>
    </>
  );
};

export default ResultsOverview;
