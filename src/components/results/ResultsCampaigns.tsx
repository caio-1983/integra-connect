import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Loader2, ArrowDownRight, ArrowUpRight, Settings2 } from 'lucide-react';
import { SectionBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { fetchCampaignPerformance, type CampaignPerformanceRow } from '@/services/analyticsService';
import { formatCurrency, formatCurrencyDelta } from '@/lib/formatCurrency';
import { useResultsPeriod } from './ResultsLayout';

/**
 * Revenue per campaign against the previous period, biggest DROP first.
 *
 * This tab exists to answer one specific question the team could not answer:
 * "three campaigns, same method, the third month revenue fell — which campaign?"
 * So the ordering is the feature. The campaign that lost the most money is row
 * one; nobody has to scan for it.
 *
 * "Não mapeado" is always shown rather than hidden. A large unmapped bucket means
 * the report is incomplete, and pretending otherwise would make the whole surface
 * untrustworthy. It links straight to where the mapping is fixed.
 */
export const ResultsCampaigns: React.FC = () => {
  const period = useResultsPeriod();
  const [rows, setRows] = useState<CampaignPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCampaignPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const unmapped = rows.find((r) => r.campaignId === null);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <>
      <SectionBlock
        title="Faturamento por campanha"
        icon={Megaphone}
        description={`Comparado com o período anterior. Ordenado pela maior queda de receita — a primeira linha é onde o faturamento caiu mais.`}
        action={
          <Link
            to="/settings/campanhas"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Gerenciar campanhas
          </Link>
        }
      >
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Nenhum lead ou fechamento no período"
            description="Quando entrarem leads ou houver negócios ganhos neste período, o faturamento aparece aqui separado por campanha."
            compact
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Faturamento, leads e variação por campanha</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-medium">Campanha</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Leads</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Ganhos</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Receita</th>
                  <th scope="col" className="py-2 pr-4 font-medium text-right">Período anterior</th>
                  <th scope="col" className="py-2 font-medium text-right">Variação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isDrop = row.revenueDelta < 0;
                  const isFlat = row.revenueDelta === 0;
                  return (
                    <tr
                      key={row.campaignId ?? row.campaignName}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2.5 pr-4">
                        <span className={row.campaignId ? 'text-foreground' : 'text-muted-foreground italic'}>
                          {row.campaignName}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {row.leads}
                        {row.leadsPrev > 0 && (
                          <span className="text-muted-foreground text-xs"> / {row.leadsPrev}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.won}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{formatCurrency(row.revenue)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">{formatCurrency(row.revenuePrev)}</td>
                      <td className="py-2.5 text-right">
                        {isFlat ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 tabular-nums font-medium ${
                              isDrop ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {isDrop ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {formatCurrencyDelta(row.revenueDelta)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="py-2.5 pr-4">Total</td>
                  <td className="py-2.5 pr-4" />
                  <td className="py-2.5 pr-4" />
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                  <td className="py-2.5 pr-4" />
                  <td className="py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionBlock>

      {unmapped && unmapped.leads > 0 && (
        <SectionBlock title="Atenção" icon={Settings2}>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{unmapped.leads} lead(s)</strong> deste período chegaram
            com sinais de rastreamento que ainda não pertencem a nenhuma campanha, e por isso aparecem
            como “Não mapeado”.{' '}
            <Link to="/settings/campanhas" className="text-primary hover:underline">
              Mapeie esses sinais
            </Link>{' '}
            — o histórico é reatribuído na hora, sem reprocessar nada.
          </p>
        </SectionBlock>
      )}
    </>
  );
};

export default ResultsCampaigns;
