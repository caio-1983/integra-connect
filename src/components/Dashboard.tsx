import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, MessageSquare, Users, Loader2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatMetric } from '../types';
import { api } from '../services/api';
import { OnboardingBanner } from './OnboardingBanner';
import { SystemHealthCard } from './SystemHealthCard';
import { useOutletContext } from 'react-router-dom';

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
  const [refreshKey, setRefreshKey] = useState(0);
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
        console.error("Erro ao carregar operações:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, refreshKey]);

  const getIcon = (label: string) => {
    if (label.includes('Conversões')) return <DollarSign className="h-5 w-5 text-emerald-500" />;
    if (label.includes('Atendimentos')) return <MessageSquare className="h-5 w-5 text-cyan-500" />;
    if (label.includes('Leads')) return <Users className="h-5 w-5 text-violet-500" />;
    return <Activity className="h-5 w-5 text-orange-500" />;
  };

  const getBorderAccent = (label: string) => {
    if (label.includes('Conversões')) return 'border-l-emerald-400';
    if (label.includes('Atendimentos')) return 'border-l-cyan-400';
    if (label.includes('Leads')) return 'border-l-violet-400';
    return 'border-l-orange-400';
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
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando operações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-background custom-scrollbar">

      {/* Onboarding Banner */}
      <OnboardingBanner onOpenWizard={() => setShowOnboarding(true)} />

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operações</h1>
          <p className="text-muted-foreground mt-1">Acompanhe a operação da sua empresa em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-background text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de indicadores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((stat, index) => (
          <div
            key={index}
            className={`rounded-xl border border-border border-l-4 bg-card p-6 shadow-sm hover:shadow-md transition-shadow ${getBorderAccent(stat.label)}`}
          >
            <div className="flex flex-row items-center justify-between pb-4">
              <div className="text-sm font-medium text-muted-foreground">{getMetricLabel(stat.label)}</div>
              <div className="p-2 rounded-lg bg-muted">
                {getIcon(stat.label)}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
              <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full border ${
                stat.trendUp
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {stat.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas operacionais */}
      <SystemHealthCard />

      {/* Conteúdo detalhado */}
      <div className="grid gap-6 md:grid-cols-7">

        {/* Volume de Atendimentos */}
        <div className="col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Volume de Atendimentos</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {period === 'today' ? 'Atendimentos de hoje' : `Atendimentos nos últimos ${periodDays[period]} dias`}
            </p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
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
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: '#0891b2' }}
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stroke="#0891b2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorChats)"
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#0891b2' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversões */}
        <div className="col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-foreground">Conversões</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Reuniões, vendas e ações concluídas</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-4">
            {chartData.slice(0, 5).map((day, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{day.name}</span>
                  <span className="text-sm font-semibold text-foreground">{day.sales} conv.</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((day.sales / Math.max(...chartData.map(d => d.sales), 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total no período</span>
              <span className="text-emerald-600 font-bold">
                {chartData.reduce((sum, d) => sum + d.sales, 0)} conversões
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
