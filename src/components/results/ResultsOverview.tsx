import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Users, Percent, Receipt } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { KPIStrip } from '@/components/operations/KPIStrip';
import { api } from '@/services/api';
import { fetchRevenueKpis, formatPercentDelta, type KpiComparison } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { useResultsPeriod } from './ResultsLayout';
import { ReportError, ReportLoading, pct } from './ResultsUi';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
  const [kpiFailed, setKpiFailed] = useState(false);
  const [chartFailed, setChartFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setKpiFailed(false);
    setChartFailed(false);

    // The daily volume chart still comes from the existing api helper, which takes
    // a day count — derived from the selected window so the chart and the KPIs
    // describe the same period.
    const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000));

    Promise.allSettled([fetchRevenueKpis(period), api.fetchChartData(days)])
      .then(([k, chart]) => {
        if (cancelled) return;
        if (k.status === 'fulfilled') setKpis(k.value);
        else { console.error('[results] KPIs:', k.reason); setKpis(null); setKpiFailed(true); }
        if (chart.status === 'fulfilled') setChartData(chart.value as { name: string; chats: number; sales: number }[]);
        else { console.error('[results] gráfico:', chart.reason); setChartFailed(true); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  const current = kpis?.current;
  const previous = kpis?.previous;
  const cmp = (a?: number, b?: number) =>
    current && previous && a !== undefined && b !== undefined
      ? { trend: formatPercentDelta(a, b), trendUp: a >= b }
      : {};

  return (
    <>
      <KPIStrip
        loading={loading}
        failed={kpiFailed}
        items={[
          { label: 'Receita ganha', value: formatCurrency(current?.revenue), icon: CircleDollarSign,
            hint: kpiFailed ? 'negócios fechados' : plural(current?.wonCount ?? 0, 'negócio fechado', 'negócios fechados'), ...cmp(current?.revenue, previous?.revenue) },
          { label: 'Leads novos', value: String(current?.newLeads ?? 0), icon: Users,
            hint: 'primeira mensagem no período', ...cmp(current?.newLeads, previous?.newLeads) },
          { label: 'Taxa de conversão', value: pct(current?.conversionRate ?? 0), icon: Percent,
            hint: kpiFailed ? 'leads que viraram venda' : plural(current?.lostCount ?? 0, 'perdido', 'perdidos'), ...cmp(current?.conversionRate, previous?.conversionRate) },
          { label: 'Ticket médio', value: formatCurrency(current?.avgTicket), icon: Receipt,
            hint: 'por negócio ganho', ...cmp(current?.avgTicket, previous?.avgTicket) },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        {kpiFailed ? 'Não foi possível carregar os indicadores.' : 'As setas comparam com o período anterior.'}
      </p>

      <Panel title="Mensagens por dia" description="Mensagens trocadas em todas as conversas no período.">
        {loading ? (
          <ReportLoading />
        ) : chartFailed ? (
          <ReportError />
        ) : (
          <div className="h-[280px] w-full px-4 pb-4">
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
                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px 0 rgba(11,20,26,.26), 0 2px 10px 0 rgba(11,20,26,.16)', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--chart-1))' }}
                  cursor={{ stroke: 'hsl(var(--border))' }}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  name="Mensagens"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorChats)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>
    </>
  );
};

export default ResultsOverview;
