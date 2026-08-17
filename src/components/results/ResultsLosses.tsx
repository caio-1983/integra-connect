import React, { useEffect, useState } from 'react';
import { TrendingDown, Loader2, Filter } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { fetchFunnel, fetchLossReport, type FunnelRow, type LossRow } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { useResultsPeriod } from './ResultsLayout';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchLossReport(period), fetchFunnel(period)])
      .then(([l, f]) => {
        if (cancelled) return;
        setLosses(l);
        setFunnel(f);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalLost = losses.reduce((sum, r) => sum + r.count, 0);
  const totalValueLost = losses.reduce((sum, r) => sum + r.valueLost, 0);
  const maxCount = Math.max(...losses.map((r) => r.count), 0);

  return (
    <>
      <SectionBlock
        title="Motivos de perda"
        icon={TrendingDown}
        description={
          totalLost > 0
            ? `${totalLost} negócio(s) perdido(s) no período, somando ${formatCurrency(totalValueLost)} que deixaram de entrar.`
            : 'Negócios marcados como perdidos no período, agrupados pelo motivo registrado.'
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        ) : losses.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="Nenhuma perda registrada"
            description="Nenhum negócio foi marcado como perdido neste período."
            compact
          />
        ) : (
          <ul className="space-y-3">
            {losses.map((row) => (
              <li key={row.code}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className={row.code === 'nao_informado' ? 'text-muted-foreground italic' : 'text-foreground'}>
                    {row.label}
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span className="tabular-nums text-muted-foreground text-xs">{formatCurrency(row.valueLost)}</span>
                    <span className="tabular-nums font-medium">{row.count}</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/70 rounded-full"
                    style={{ width: `${maxCount > 0 ? (row.count / maxCount) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <SectionBlock
        title="Onde o funil trava"
        icon={Filter}
        description="Quantos negócios distintos entraram em cada etapa no período. A queda entre duas etapas é onde a conversão se perde."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        ) : funnel.every((s) => s.entered === 0) ? (
          <EmptyState
            icon={Filter}
            title="Sem movimentação no período"
            description="Nenhum negócio mudou de etapa neste período. O histórico de etapas passa a ser registrado a partir de agora, então períodos anteriores podem aparecer vazios."
            compact
          />
        ) : (
          <ul className="space-y-3">
            {funnel.map((stage, index) => {
              const previous = index > 0 ? funnel[index - 1] : null;
              // Drop-off is only meaningful between consecutive stages that both
              // saw movement; showing "-100%" from an empty stage would be noise.
              const dropOff = previous && previous.entered > 0
                ? ((previous.entered - stage.entered) / previous.entered) * 100
                : null;

              return (
                <li key={stage.stageId}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="text-foreground">{stage.title}</span>
                    <span className="flex items-baseline gap-3">
                      {dropOff !== null && dropOff > 0 && (
                        <span className="text-xs text-red-700 tabular-nums">-{dropOff.toFixed(0)}%</span>
                      )}
                      <span className="tabular-nums font-medium">{stage.entered}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${stage.share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionBlock>
    </>
  );
};

export default ResultsLosses;
