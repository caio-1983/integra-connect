import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  Zap,
  LayoutList,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react';
import { PageContainer, PageHeader, SectionBlock } from '@/components/layout';
import { KPICard } from '@/components/ui/cards/KPICard';
import { ImmediateActions, type ActionItem } from '@/components/operations/ImmediateActions';
import { OperationalSummary } from '@/components/operations/OperationalSummary';
import { api } from '@/services/api';
import { type StatMetric } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface OperationsKPI {
  atendimentos: StatMetric | null;
  leads: StatMetric | null;
  conversoes: StatMetric | null;
  tempoResposta: StatMetric | null;
}

const EMPTY_KPIS: OperationsKPI = {
  atendimentos:  null,
  leads:         null,
  conversoes:    null,
  tempoResposta: null,
};

const Operations: React.FC = () => {
  const [kpis, setKpis] = useState<OperationsKPI>(EMPTY_KPIS);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingActions, setLoadingActions] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const metrics = await api.fetchDashboardMetrics(1);
      const find = (keyword: string) => metrics.find(m => m.label.toLowerCase().includes(keyword)) ?? null;
      setKpis({
        atendimentos:  find('atendimento'),
        leads:         find('lead'),
        conversoes:    find('convers'),
        tempoResposta: find('resposta') ?? find('tempo'),
      });
    } catch {
      /* silent — empty states handle absence */
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const [waitingRes, overdueRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'human'),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .lt('date', today),
      ]);

      const items: ActionItem[] = [];

      const waitingCount = waitingRes.count ?? 0;
      if (waitingCount > 0) {
        items.push({
          id:          'waiting-conversations',
          type:        'conversation',
          label:       `${waitingCount} conversa${waitingCount > 1 ? 's' : ''} aguardando atendimento`,
          description: 'Conversas em modo humano sem resposta recente',
          urgency:     waitingCount >= 5 ? 'high' : 'medium',
          meta:        waitingCount.toString(),
        });
      }

      const overdueCount = overdueRes.count ?? 0;
      if (overdueCount > 0) {
        items.push({
          id:          'overdue-appointments',
          type:        'overdue',
          label:       `${overdueCount} agendamento${overdueCount > 1 ? 's' : ''} vencido${overdueCount > 1 ? 's' : ''}`,
          description: 'Compromissos com data passada sem registro de conclusão',
          urgency:     'medium',
          meta:        overdueCount.toString(),
        });
      }

      setActions(items);
    } catch {
      setActions([]);
    } finally {
      setLoadingActions(false);
    }
  }, []);

  useEffect(() => {
    loadKpis();
    loadActions();
  }, [loadKpis, loadActions, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const isLoading = loadingKpis || loadingActions;

  const refreshAction = (
    <button
      onClick={handleRefresh}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-all duration-150"
    >
      {isLoading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <RefreshCw className="w-3.5 h-3.5" />
      }
      Atualizar
    </button>
  );

  const kpiValue = (metric: StatMetric | null, fallback = '—') =>
    metric?.value ?? fallback;

  return (
    <PageContainer>
      <PageHeader
        title="Visão Geral"
        description="Centro de operações do atendimento em tempo real."
        actions={refreshAction}
      />

      {/* KPIs */}
      <SectionBlock
        title="Indicadores do Dia"
        icon={TrendingUp}
        description="Métricas acumuladas desde o início do dia"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Atendimentos"
            value={kpiValue(kpis.atendimentos)}
            trend={kpis.atendimentos?.trend}
            trendUp={kpis.atendimentos?.trendUp}
            subLabel="vs. ontem"
            icon={MessageSquare}
            color="cyan"
            loading={loadingKpis}
          />
          <KPICard
            label="Novos Leads"
            value={kpiValue(kpis.leads)}
            trend={kpis.leads?.trend}
            trendUp={kpis.leads?.trendUp}
            subLabel="vs. ontem"
            icon={Users}
            color="violet"
            loading={loadingKpis}
          />
          <KPICard
            label="Conversões"
            value={kpiValue(kpis.conversoes)}
            trend={kpis.conversoes?.trend}
            trendUp={kpis.conversoes?.trendUp}
            subLabel="negócios ganhos + agendamentos"
            icon={TrendingUp}
            color="emerald"
            loading={loadingKpis}
          />
          <KPICard
            label="Tempo Médio IA"
            value={kpiValue(kpis.tempoResposta)}
            trend={kpis.tempoResposta?.trend}
            trendUp={kpis.tempoResposta?.trendUp}
            subLabel="tempo de resposta da Nina"
            icon={Clock}
            color="amber"
            loading={loadingKpis}
          />
        </div>
      </SectionBlock>

      {/* Ações Imediatas */}
      <SectionBlock
        title="Ações Imediatas"
        icon={Zap}
        description="Atividades que exigem intervenção agora"
      >
        <ImmediateActions items={actions} loading={loadingActions} />
      </SectionBlock>

      {/* Resumo Operacional */}
      <SectionBlock
        title="Resumo Operacional"
        icon={LayoutList}
        description="Conversas recentes e próximos agendamentos"
      >
        <OperationalSummary key={refreshKey} />
      </SectionBlock>
    </PageContainer>
  );
};

export default Operations;
