import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, MessageSquare, Users, Loader2, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatMetric } from '../types';
import { api } from '../services/api';
import { OnboardingBanner } from './OnboardingBanner';
import { SystemHealthCard } from './SystemHealthCard';
import { useOutletContext } from 'react-router-dom';
import { PageContainer, PageHeader } from '@/components/layout';

interface OutletContext {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
}

type PeriodFilter = 'today' | '7days' | '30days';

const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoje',
  '7days': '7 Dias',
  '30days': '30 Dias'
};

const periodDays: Record<PeriodFilter, number> = {
  today: 1,
  '7days': 7,
  '30days': 30
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<StatMetric[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const { setShowOnboarding } = useOutletContext<OutletContext>();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const days = periodDays[period];
        const [metricsData, chartDataResponse] = await Promise.all([
          api.fetchDashboardMetrics(days),
          api.fetchChartData(days)
        ]);
        setMetrics(metricsData);
        setChartData(chartDataResponse);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  const getIcon = (label: string) => {
    if (label.includes('Conversões')) return <DollarSign className="h-5 w-5 text-emerald-600" />;
    if (label.includes('Atendimentos')) return <MessageSquare className="h-5 w-5 text-cyan-600" />;
    if (label.includes('Leads')) return <Users className="h-5 w-5 text-violet-600" />;
    return <Activity className="h-5 w-5 text-orange-600" />;
  };

  const getGradient = (label: string) => {
    if (label.includes('Conversões')) return 'from-emerald-50 to-transparent border-emerald-200';
    if (label.includes('Atendimentos')) return 'from-cyan-50 to-transparent border-cyan-200';
    if (label.includes('Leads')) return 'from-violet-50 to-transparent border-violet-200';
    return 'from-orange-50 to-transparent border-orange-200';
  };

  const getMetricLabel = (baseLabel: string) => {
    if (baseLabel.includes('Atendimentos')) {
      return period === 'today' ? 'Atendimentos Hoje' : `Atendimentos (${periodLabels[period]})`;
    }
    if (baseLabel.includes('Leads')) {
      return period === 'today' ? 'Novos Leads' : `Novos Leads (${periodLabels[period]})`;
    }
    return baseLabel;
  };

  if (loading) {
    return (
      <PageContainer className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando insights...</p>
        </div>
      </PageContainer>
    );
  }

  const periodFilter = (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
      {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            period === p
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  );

  return (
    <PageContainer>
      <OnboardingBanner onOpenWizard={() => setShowOnboarding(true)} />
      <SystemHealthCard />

      <PageHeader
        title="Dashboard"
        description={`Visão geral da performance da sua IA ${period === 'today' ? 'hoje' : `nos últimos ${periodLabels[period].toLowerCase()}`}.`}
        actions={periodFilter}
      />

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((stat, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br bg-card p-6 shadow-sm transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md group ${getGradient(stat.label)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="text-sm font-medium text-muted-foreground">{getMetricLabel(stat.label)}</div>
              <div className="p-2 rounded-lg bg-muted border border-border group-hover:border-border/60 transition-colors">
                {getIcon(stat.label)}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
              <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full border ${stat.trendUp ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {stat.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <div className="col-span-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Volume de Atendimentos</h3>
              <p className="text-sm text-muted-foreground">
                Interações da IA {period === 'today' ? 'hoje' : `nos últimos ${periodDays[period]} dias`}
              </p>
            </div>
            <button className="text-primary hover:text-primary/80 transition-colors p-2 hover:bg-primary/10 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  fontSize={12}
                  stroke="#94a3b8"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}
                  itemStyle={{ color: '#0891b2' }}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke="#0891b2"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorChats)"
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#0891b2' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="col-span-3 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Conversões</h3>
            <p className="text-sm text-muted-foreground">Reuniões, vendas e ações concluídas</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-5">
            {chartData.slice(0, 5).map((day, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{day.name}</span>
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{day.sales} conv.</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((day.sales / Math.max(...chartData.map(d => d.sales), 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total no período</span>
              <span className="text-emerald-700 font-bold">
                {chartData.reduce((sum, d) => sum + d.sales, 0)} conversões
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
