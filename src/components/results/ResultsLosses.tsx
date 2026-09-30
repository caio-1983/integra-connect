import React, { useEffect, useState } from 'react';
import { TrendingDown, Filter } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { fetchFunnel, fetchLossReport, type FunnelRow, type LossRow } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { useResultsPeriod } from './ResultsLayout';
import { ReportEmpty, ReportError, ReportLoading } from './ResultsUi';

/**
 * "O que está deixando de converter?" — two complementary answers.
 *
 * WHY deals are lost comes from the loss taxonomy; WHERE they stall comes from
 * the stage-transition history. Neither existed before: losses were free text and
 * stage changes were never recorded at all, so the funnel could not be drawn.
 */
export const ResultsLosses: React.FC = () => {
  const period = useResultsPeriod();
  const [losses, setLosses] = useState<LossRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lossFailed, setLossFailed] = useState(false);
  const [funnelFailed, setFunnelFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([fetchLossReport(period), fetchFunnel(period)])
      .then(([l, f]) => {
        if (cancelled) return;
        setLosses(l.status === 'fulfilled' ? l.value : []);
        setLossFailed(l.status === 'rejected');
        setFunnel(f.status === 'fulfilled' ? f.value : []);
        setFunnelFailed(f.status === 'rejected');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalLost = losses.reduce((sum, r) => sum + r.count, 0);
  const totalValueLost = losses.reduce((sum, r) => sum + r.valueLost, 0);
  const maxCount = Math.max(...losses.map((r) => r.count), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
      <Panel
        title="Motivos de perda"
        description={
          !loading && !lossFailed && totalLost > 0
            ? `${totalLost} ${totalLost === 1 ? 'negócio perdido' : 'negócios perdidos'}, somando ${formatCurrency(totalValueLost)} que deixaram de entrar.`
            : 'Negócios marcados como perdidos, agrupados pelo motivo registrado.'
        }
      >
        {loading ? (
          <ReportLoading />
        ) : lossFailed ? (
          <ReportError />
        ) : losses.length === 0 ? (
          <ReportEmpty icon={TrendingDown} title="Nenhuma perda registrada" text="Nenhum negócio foi marcado como perdido neste período." />
        ) : (
          <ul className="px-6 pt-2 pb-5 space-y-4">
            {losses.map((row) => (
              <li key={row.code}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className={cn('text-[15px]', row.code === 'nao_informado' ? 'text-muted-foreground' : 'text-foreground')}>
                    {row.label}
                  </span>
                  <span className="flex items-baseline gap-3 tabular-nums">
                    <span className="text-xs text-muted-foreground">{formatCurrency(row.valueLost)}</span>
                    <span className="text-[15px] font-medium text-foreground">{row.count}</span>
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-danger rounded-full" style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Onde o funil trava"
        description="Quantos negócios entraram em cada etapa. A queda entre duas etapas é onde a conversão se perde."
      >
        {loading ? (
          <ReportLoading />
        ) : funnelFailed ? (
          <ReportError />
        ) : funnel.every((s) => s.entered === 0) ? (
          <ReportEmpty
            icon={Filter}
            title="Sem movimentação no período"
            text="Nenhum negócio mudou de etapa neste período. O histórico de etapas só é registrado desde a atualização do funil."
          />
        ) : (
          <ul className="px-6 pt-2 pb-5 space-y-4">
            {funnel.map((stage, index) => {
              const previous = index > 0 ? funnel[index - 1] : null;
              // Drop-off is only meaningful between consecutive stages that both
              // saw movement; showing "-100%" from an empty stage would be noise.
              const dropOff = previous && previous.entered > 0
                ? ((previous.entered - stage.entered) / previous.entered) * 100
                : null;

              return (
                <li key={stage.stageId}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-[15px] text-foreground">{stage.title}</span>
                    <span className="flex items-baseline gap-3 tabular-nums">
                      {dropOff !== null && dropOff > 0 && (
                        <span className="text-xs text-danger">
                          <span className="sr-only">Queda de </span>-{dropOff.toFixed(0)}%
                        </span>
                      )}
                      <span className="text-[15px] font-medium text-foreground">{stage.entered}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${stage.share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default ResultsLosses;
