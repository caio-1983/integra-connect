import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Hand } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { fetchOriginPerformance, type OriginRow } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import type { ChannelType } from '@/types/channel';
import { cn } from '@/lib/utils';
import { useResultsPeriod } from './ResultsLayout';
import { ReportEmpty, ReportError, ReportLoading, ReportNotice, pct, td, th, tableWrap } from './ResultsUi';

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchOriginPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) { setRows([]); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const totalLeads = rows.reduce((sum, r) => sum + r.leads, 0);
  const untracked = rows.filter((r) => r.kind === 'unknown').reduce((sum, r) => sum + r.leads, 0);
  const maxLeads = Math.max(...rows.map((r) => r.leads), 0);

  return (
    <>
      <Panel
        title="Origem dos leads"
        description="Quantos leads cada origem trouxe e quantos fecharam. A conversão mostra a diferença entre volume e qualidade."
      >
        {loading ? (
          <ReportLoading />
        ) : failed ? (
          <ReportError />
        ) : rows.length === 0 ? (
          <ReportEmpty icon={Globe} title="Nenhum lead no período" text="Quando novos contatos chegarem, a origem de cada um aparece aqui." />
        ) : (
          <div className={tableWrap}>
            <table className="w-full">
              <caption className="sr-only">Leads, fechamentos e conversão por origem</caption>
              <thead>
                <tr className="text-left border-b border-border">
                  <th scope="col" className={th}>Origem</th>
                  <th scope="col" className={th}>Canal</th>
                  <th scope="col" className={cn(th, 'text-right')}>Leads</th>
                  <th scope="col" className={cn(th, 'text-right')}>Ganhos</th>
                  <th scope="col" className={cn(th, 'text-right')}>Conversão</th>
                  <th scope="col" className={cn(th, 'text-right pr-0')}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.channel}-${row.setManually}`} className="border-b border-border last:border-0">
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">{row.kindLabel}</span>
                        {row.setManually && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] px-2 h-5 rounded-full bg-secondary text-secondary-foreground"
                            title="Origem informada pelo atendente, não capturada automaticamente"
                          >
                            <Hand className="w-3 h-3" aria-hidden="true" /> manual
                          </span>
                        )}
                      </div>
                      {/* Share bar reads at a glance without a chart library —
                          "Informação antes de gráficos" (UI-008). */}
                      <div className="h-1 mt-1.5 bg-secondary rounded-full overflow-hidden max-w-[10rem]" aria-hidden="true">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${maxLeads > 0 ? (row.leads / maxLeads) * 100 : 0}%` }} />
                      </div>
                    </td>
                    <td className={cn(td, 'text-muted-foreground')}>{channelLabel(row.channel)}</td>
                    <td className={cn(td, 'text-right')}>{row.leads}</td>
                    <td className={cn(td, 'text-right')}>{row.won}</td>
                    <td className={cn(td, 'text-right')}>{pct(row.conversionRate)}</td>
                    <td className={cn(td, 'text-right font-medium pr-0')}>{formatCurrency(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {!loading && !failed && untracked > 0 && (
        <ReportNotice>
          <strong className="font-medium text-foreground">{untracked} de {totalLeads} leads</strong>{' '}
          chegaram sem nenhum sinal de origem. Anúncios da Meta são capturados sozinhos; para o site é preciso usar
          links com token, e contatos orgânicos precisam ser marcados na conversa.{' '}
          <Link to="/campanhas/configurar" className="text-primary hover:underline underline-offset-4">Ver como rastrear cada origem</Link>.
        </ReportNotice>
      )}
    </>
  );
};

export default ResultsOrigin;
