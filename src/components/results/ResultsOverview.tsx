import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleDollarSign, Users, Percent, Receipt } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { KPIStrip } from '@/components/operations/KPIStrip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchDailyContacts, fetchRevenueKpis, formatPercentDelta, type DailyContactsPoint, type KpiComparison,
} from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { useResultsPeriod } from './ResultsLayout';
import { ReportError, ReportLoading, pct } from './ResultsUi';

/** `YYYY-MM-DD` of today on the Brasília calendar. */
const todayBrt = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
/** Brasília has had no DST since 2019, so a fixed -03:00 offset is exact. */
const brtMidnight = (day: string) => new Date(`${day}T00:00:00-03:00`);
const shiftDay = (day: string, delta: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

const plural =(n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
  const [loading, setLoading] = useState(true);
  const [kpiFailed, setKpiFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setKpiFailed(false);

    fetchRevenueKpis(period)
      .then((k) => { if (!cancelled) setKpis(k); })
      .catch((err) => {
        if (cancelled) return;
        console.error('[results] KPIs:', err); setKpis(null); setKpiFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  // The daily chart has its own window, independent of the page period: it
  // always opens on the last 30 days and the user narrows it with its own dates.
  const [range, setRange] = useState(() => ({ from: shiftDay(todayBrt(), -29), to: todayBrt() }));
  const [chartData, setChartData] = useState<DailyContactsPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartFailed, setChartFailed] = useState(false);

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    let cancelled = false;
    setChartLoading(true);
    setChartFailed(false);

    const from = brtMidnight(range.from);
    const to = brtMidnight(shiftDay(range.to, 1));
    fetchDailyContacts({ from, to })
      .then((points) => { if (!cancelled) setChartData(points); })
      .catch((err) => {
        if (cancelled) return;
        console.error('[results] gráfico:', err); setChartFailed(true);
      })
      .finally(() => { if (!cancelled) setChartLoading(false); });

    return () => { cancelled = true; };
  }, [range]);

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

      <Panel title="Pessoas que entraram em contato por dia" description="Contatos diferentes que mandaram mensagem em cada dia.">
        <div className="flex flex-wrap items-end gap-3 px-4 pb-3">
          <div className="space-y-1.5">
            <Label htmlFor="daily-from">De</Label>
            <Input
              id="daily-from"
              type="date"
              className="w-auto"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-to">Até</Label>
            <Input
              id="daily-to"
              type="date"
              className="w-auto"
              value={range.to}
              min={range.from}
              max={todayBrt()}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>
        {chartLoading ? (
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
                  dataKey="contacts"
                  name="Pessoas"
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
