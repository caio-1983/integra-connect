import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { fetchCampaignPerformance, type CampaignPerformanceRow } from '@/services/analyticsService';
import { formatCurrency, formatCurrencyDelta } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { useResultsPeriod } from './ResultsLayout';
import { ReportEmpty, ReportError, ReportLoading, ReportNotice, td, th, tableWrap } from './ResultsUi';

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchCampaignPerformance(period)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) { setRows([]); setFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const unmapped = rows.find((r) => r.campaignId === null);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <>
      <Panel
        title="Faturamento por campanha"
        description="Comparado com o período anterior. A primeira linha é a campanha em que a receita mais caiu."
        action={<Link to="/campanhas/configurar" className="text-sm text-primary hover:underline underline-offset-4 rounded-sm">Gerenciar campanhas</Link>}
      >
        {loading ? (
          <ReportLoading />
        ) : failed ? (
          <ReportError />
        ) : rows.length === 0 ? (
          <ReportEmpty
            icon={Megaphone}
            title="Nenhum lead ou fechamento no período"
            text="Quando entrarem leads ou houver negócios ganhos, o faturamento aparece aqui separado por campanha."
          />
        ) : (
          <div className={tableWrap}>
            <table className="w-full">
              <caption className="sr-only">Faturamento, leads e variação por campanha</caption>
              <thead>
                <tr className="text-left border-b border-border">
                  <th scope="col" className={th}>Campanha</th>
                  <th scope="col" className={cn(th, 'text-right')}>Leads</th>
                  <th scope="col" className={cn(th, 'text-right')}>Ganhos</th>
                  <th scope="col" className={cn(th, 'text-right')}>Receita</th>
                  <th scope="col" className={cn(th, 'text-right')}>Período anterior</th>
                  <th scope="col" className={cn(th, 'text-right pr-0')}>Variação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isDrop = row.revenueDelta < 0;
                  const isFlat = row.revenueDelta === 0;
                  return (
                    <tr key={row.campaignId ?? row.campaignName} className="border-b border-border last:border-0">
                      <td className={cn(td, row.campaignId ? 'text-foreground' : 'text-muted-foreground')}>
                        {row.campaignName}
                      </td>
                      <td className={cn(td, 'text-right')}>
                        {row.leads}
                        {row.leadsPrev > 0 && <span className="text-muted-foreground text-xs"> / {row.leadsPrev}</span>}
                      </td>
                      <td className={cn(td, 'text-right')}>{row.won}</td>
                      <td className={cn(td, 'text-right font-medium')}>{formatCurrency(row.revenue)}</td>
                      <td className={cn(td, 'text-right text-muted-foreground')}>{formatCurrency(row.revenuePrev)}</td>
                      <td className={cn(td, 'text-right pr-0')}>
                        {isFlat ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={cn('inline-flex items-center gap-1 font-medium', isDrop ? 'text-danger' : 'text-success')}>
                            {isDrop ? <ArrowDownRight className="w-4 h-4" aria-hidden="true" /> : <ArrowUpRight className="w-4 h-4" aria-hidden="true" />}
                            <span className="sr-only">{isDrop ? 'Queda de' : 'Alta de'}</span>
                            {formatCurrencyDelta(row.revenueDelta)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className={cn(td, 'font-medium')}>Total</td>
                  <td className={td} />
                  <td className={td} />
                  <td className={cn(td, 'text-right font-medium')}>{formatCurrency(totalRevenue)}</td>
                  <td className={td} />
                  <td className={cn(td, 'pr-0')} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      {!failed && unmapped && unmapped.leads > 0 && (
        <ReportNotice>
          <strong className="font-medium text-foreground">
            {unmapped.leads} {unmapped.leads === 1 ? 'lead' : 'leads'}
          </strong>{' '}
          deste período chegaram com sinais de rastreamento que ainda não pertencem a nenhuma campanha, por isso
          aparecem como "Não mapeado".{' '}
          <Link to="/campanhas/configurar" className="text-primary hover:underline underline-offset-4">Mapear esses sinais</Link>.
          O histórico é reatribuído na hora.
        </ReportNotice>
      )}
    </>
  );
};

export default ResultsCampaigns;
