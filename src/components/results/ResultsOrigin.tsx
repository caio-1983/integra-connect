import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Loader2, Hand, Settings2 } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { fetchOriginPerformance, type OriginRow } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import type { ChannelType } from '@/types/channel';
import { useResultsPeriod } from './ResultsLayout';

/** Channel label from the shared registry, falling back to the raw value for
 *  'manual'/'unknown' which aren't real channels. */
function channelLabel(channel: string): string {
  return CHANNEL_CONFIG[channel as ChannelType]?.label
    ?? (channel === 'manual' ? 'Informado manualmente' : 'Não identificado');
}

/**
 * Leads and conversion by origin — "de onde vem esse lead?" and "qual origem
 * converte melhor?".
 *
 * Manually-set origins are marked, not hidden. Organic, referral and offline
 * leads can only be attributed by hand, so mixing a stated origin with a measured
 * one without saying so would overstate how much of the funnel is actually
 * tracked.
 */
export const ResultsOrigin: React.FC = () => {
  const period = useResultsPeriod();
  const [rows, setRows] = useState<OriginRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOriginPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalLeads = rows.reduce((sum, r) => sum + r.leads, 0);
  const untracked = rows.filter((r) => r.kind === 'unknown').reduce((sum, r) => sum + r.leads, 0);
  const maxLeads = Math.max(...rows.map((r) => r.leads), 0);

  return (
    <>
      <SectionBlock
        title="Origem dos leads"
        icon={Globe}
        description="Quantos leads cada origem trouxe e quantos deles fecharam. A taxa de conversão é o que diferencia volume de qualidade."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Nenhum lead no período"
            description="Quando novos contatos chegarem, a origem de cada um aparece aqui."
            compact
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Leads, fechamentos e conversão por origem</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-medium">Origem</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Canal</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Leads</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Ganhos</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Conversão</th>
                  <th scope="col" className="py-2 font-medium text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.channel}-${row.setManually}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{row.kindLabel}</span>
                        {row.setManually && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            title="Origem informada pelo atendente, não capturada automaticamente"
                          >
                            <Hand className="w-2.5 h-2.5" /> manual
                          </span>
                        )}
                      </div>
                      {/* Share bar reads at a glance without a chart library —
                          "Informação antes de gráficos" (UI-008). */}
                      <div className="h-1 mt-1.5 bg-muted rounded-full overflow-hidden max-w-[10rem]">
                        <div
                          className="h-full bg-primary/70 rounded-full"
                          style={{ width: `${maxLeads > 0 ? (row.leads / maxLeads) * 100 : 0}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{channelLabel(row.channel)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.leads}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.won}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{row.conversionRate.toFixed(1)}%</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      {!loading && untracked > 0 && (
        <SectionBlock title="Cobertura do rastreamento" icon={Settings2}>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">
              {untracked} de {totalLeads} lead(s)
            </strong>{' '}
            chegaram sem nenhum sinal de origem. Anúncios da Meta são capturados sozinhos; para o site é
            preciso usar links com token, e contatos orgânicos precisam ser marcados na conversa.{' '}
            <Link to="/campanhas/configurar" className="text-primary hover:underline">
              Ver como rastrear cada origem
            </Link>
            .
          </p>
        </SectionBlock>
      )}
    </>
  );
};

export default ResultsOrigin;
