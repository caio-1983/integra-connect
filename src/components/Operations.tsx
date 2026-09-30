import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, MessageSquare, Users, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { KPIStrip } from '@/components/operations/KPIStrip';
import { ImmediateActions, type ActionItem } from '@/components/operations/ImmediateActions';
import { OperationalSummary } from '@/components/operations/OperationalSummary';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { localDateString } from '@/lib/localDate';
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
  const [kpiError, setKpiError] = useState(false);
  const [loadingActions, setLoadingActions] = useState(true);
  const [actionsError, setActionsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    setKpiError(false);
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
      // A failed query must show as unknown ('—'), never as zero.
      setKpiError(true);
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  const loadActions = useCallback(async () => {
    setLoadingActions(true);
    setActionsError(false);
    try {
      const today = localDateString();

      const [waitingRes, overdueRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'human'),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .lt('date', today)
          .or('status.is.null,status.not.in.(cancelled,completed)'),
      ]);

      // supabase-js reports query errors in the result instead of throwing —
      // a failed count must not read as "0 pendências".
      if (waitingRes.error || overdueRes.error) {
        setActions([]);
        setActionsError(true);
        return;
      }

      const items: ActionItem[] = [];

      const waitingCount = waitingRes.count ?? 0;
      if (waitingCount > 0) {
        items.push({
          id:          'waiting-conversations',
          type:        'conversation',
          label:       `${waitingCount} conversa${waitingCount > 1 ? 's' : ''} em atendimento humano`,
          description: 'A Lu não responde nessas conversas; a equipe precisa acompanhar',
          urgency:     waitingCount >= 5 ? 'high' : 'medium',
          href:        '/chat',
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
          href:        '/scheduling',
          meta:        overdueCount.toString(),
        });
      }

      setActions(items);
    } catch {
      setActions([]);
      setActionsError(true);
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
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
      {isLoading
        ? <Loader2 className="animate-spin" aria-hidden="true" />
        : <RefreshCw aria-hidden="true" />
      }
      {isLoading ? 'Atualizando…' : 'Atualizar'}
    </Button>
  );

  const kpiValue = (metric: StatMetric | null) => metric?.value ?? '—';

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <PageContainer>
      <PageHeader
        title="Visão Geral"
        description={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={refreshAction}
      />

      <div className="flex flex-col gap-3">
        <section aria-labelledby="kpi-title" className="flex flex-col gap-2">
          <h2 id="kpi-title" className="text-sm text-muted-foreground">
            Hoje, desde 00:00{kpiError && <span className="text-danger"> · não foi possível carregar os números</span>}
          </h2>
          <KPIStrip
            loading={loadingKpis}
            failed={kpiError}
            items={[
              { label: 'Atendimentos', value: kpiValue(kpis.atendimentos), hint: 'conversas com mensagem hoje', icon: MessageSquare, trend: kpis.atendimentos?.trend, trendUp: kpis.atendimentos?.trendUp },
              { label: 'Novos leads', value: kpiValue(kpis.leads), hint: 'primeira mensagem de um contato', icon: Users, trend: kpis.leads?.trend, trendUp: kpis.leads?.trendUp },
              { label: 'Conversões', value: kpiValue(kpis.conversoes), hint: 'negócios ganhos + agendamentos', icon: TrendingUp, trend: kpis.conversoes?.trend, trendUp: kpis.conversoes?.trendUp },
              { label: 'Resposta da Lu', value: kpiValue(kpis.tempoResposta), hint: 'tempo médio de resposta', icon: Clock, trend: kpis.tempoResposta?.trend, trendUp: kpis.tempoResposta?.trendUp },
            ]}
          />
          <p className="text-xs text-muted-foreground">As setas comparam com ontem.</p>
        </section>

        <Panel title="Precisa de você">
          <ImmediateActions items={actions} loading={loadingActions} error={actionsError} />
        </Panel>

        <OperationalSummary key={refreshKey} />
      </div>
    </PageContainer>
  );
};

export default Operations;
