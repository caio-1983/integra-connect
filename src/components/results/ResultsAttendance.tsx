import React, { useMemo, useState } from 'react';
import { ChevronDown, Headset, TriangleAlert } from 'lucide-react';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { fetchAttendantXray, formatDuration, type AttendantXrayRow } from '@/services/analyticsService';
import { formatCurrency } from '@/lib/formatCurrency';
import { readableAdName, adCode } from '@/lib/adName';
import { cn } from '@/lib/utils';
import { useResultsPeriod } from './ResultsLayout';
import { useReport } from './useReport';
import { ReportEmpty, ReportError, ReportLoading, ReportNotice, td, th, tableWrap } from './ResultsUi';

/**
 * Raio-x dos atendentes — managers and admins only (route guard here, and the
 * SQL function refuses anyone else).
 *
 * One row per attendant to compare at a glance: sales, money (the commission
 * base — commission itself is calculated outside the system for now), ticket,
 * conversion of the contacts they received, losses and first-response speed.
 * A row opens into where the sales came from, why deals were lost and the
 * day-to-day rhythm.
 *
 * A sale counts for the deal's owner; a deal without one goes to whoever is
 * responsible for the WhatsApp number it came in on.
 */

const conversion = (won: number, total: number) => (won === 0 ? null : `1 em ${Math.round(total / won)}`);

function adLabel(raw: string | null): string {
  if (!raw) return 'Sem anúncio';
  const code = adCode(raw);
  return code ? `${readableAdName(raw)} (${code})` : readableAdName(raw);
}

export const ResultsAttendance: React.FC = () => {
  const period = useResultsPeriod();
  const { data, loading, failed } = useReport('attendance-xray', fetchAttendantXray, period);
  const rows: AttendantXrayRow[] = useMemo(() => data ?? [], [data]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    leads: t.leads + r.leads,
    leadsWon: t.leadsWon + r.leadsWon,
    wonCount: t.wonCount + r.wonCount,
    revenue: t.revenue + r.revenue,
    lostCount: t.lostCount + r.lostCount,
    awaiting: t.awaiting + r.awaitingCount,
  }), { leads: 0, leadsWon: 0, wonCount: 0, revenue: 0, lostCount: 0, awaiting: 0 }), [rows]);

  const active = rows.some((r) => r.leads + r.wonCount + r.lostCount + r.messagesSent + r.awaitingCount > 0);

  return (
    <>
      <Panel
        title="Raio-x dos atendentes"
        description="Vendas, conversão, perdas e ritmo de cada atendente no período. A venda conta para o responsável do negócio; negócio sem responsável vai para quem cuida do número de WhatsApp."
      >
        {loading ? (
          <ReportLoading />
        ) : failed ? (
          <ReportError />
        ) : !active ? (
          <ReportEmpty
            icon={Headset}
            title="Nenhuma atividade no período"
            text="Nenhum contato recebido, venda ou perda neste período. Troque o período no alto da página."
          />
        ) : (
          <div className={tableWrap}>
            <table className="w-full min-w-[56rem]">
              <caption className="sr-only">Vendas, conversão, perdas e tempo de resposta por atendente</caption>
              <thead>
                <tr className="text-left border-b border-border">
                  <th scope="col" className={th}>Atendente</th>
                  <th scope="col" className={cn(th, 'text-right')}>Vendas</th>
                  <th scope="col" className={cn(th, 'text-right')}>Vendido</th>
                  <th scope="col" className={cn(th, 'text-right')}>Ticket médio</th>
                  <th scope="col" className={cn(th, 'text-right')}>Conversão</th>
                  <th scope="col" className={cn(th, 'text-right')}>Perdas</th>
                  <th scope="col" className={cn(th, 'text-right')}>1ª resposta</th>
                  <th scope="col" className={cn(th, 'text-right pr-0')}>Esperando agora</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = row.memberId ?? 'none';
                  const isOpen = openKey === key;
                  const idle = row.leads + row.wonCount + row.lostCount + row.messagesSent + row.awaitingCount === 0;
                  const conv = conversion(row.leadsWon, row.leads);
                  const detailsId = `xray-${key}`;
                  return (
                    <React.Fragment key={key}>
                      <tr className={cn('border-b border-border', isOpen && 'border-transparent', idle && 'text-muted-foreground')}>
                        <td className={td}>
                          <button
                            type="button"
                            onClick={() => setOpenKey(isOpen ? null : key)}
                            aria-expanded={isOpen}
                            aria-controls={detailsId}
                            className="flex items-center gap-3 text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ChevronDown
                              className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', isOpen && 'rotate-180')}
                              aria-hidden="true"
                            />
                            {row.memberId ? (
                              <ContactAvatar name={row.name} className="w-8 h-8 text-xs flex-shrink-0" />
                            ) : (
                              <span className="w-8 h-8 rounded-full border border-dashed border-border flex-shrink-0" aria-hidden="true" />
                            )}
                            <span className="flex flex-col min-w-0">
                              <span className={cn('truncate', idle ? 'text-muted-foreground' : 'text-foreground font-medium')}>{row.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {row.leads} {row.leads === 1 ? 'contato recebido' : 'contatos recebidos'}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className={cn(td, 'text-right', row.wonCount > 0 && 'font-semibold text-foreground')}>{row.wonCount}</td>
                        <td className={cn(td, 'text-right')}>
                          {row.revenue > 0 ? <span className="font-semibold text-foreground">{formatCurrency(row.revenue)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className={cn(td, 'text-right')}>
                          {row.wonCount > 0 ? formatCurrency(row.revenue / row.wonCount) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className={cn(td, 'text-right')}>
                          {conv ? (
                            <span className="flex flex-col items-end leading-tight">
                              <span>{conv}</span>
                              <span className="text-xs text-muted-foreground">{row.leadsWon} de {row.leads}</span>
                            </span>
                          ) : <span className="text-muted-foreground">{row.leads > 0 ? `0 de ${row.leads}` : '—'}</span>}
                        </td>
                        <td className={cn(td, 'text-right', row.lostCount === 0 && 'text-muted-foreground')}>{row.lostCount}</td>
                        <td className={cn(td, 'text-right', row.avgFirstResponseSeconds === null && 'text-muted-foreground')}>
                          {formatDuration(row.avgFirstResponseSeconds)}
                        </td>
                        <td className={cn(td, 'text-right pr-0')}>
                          {row.awaitingCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-warning font-medium">
                              <TriangleAlert className="w-4 h-4" aria-hidden="true" />
                              {row.awaitingCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr id={detailsId} className="border-b border-border">
                          <td colSpan={8} className="pb-4 pt-1">
                            <AttendantDetails row={row} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="text-muted-foreground">
                  <th scope="row" className={cn(td, 'text-left font-normal text-sm')}>Equipe</th>
                  <td className={cn(td, 'text-right font-semibold text-foreground')}>{totals.wonCount}</td>
                  <td className={cn(td, 'text-right font-semibold text-foreground')}>{formatCurrency(totals.revenue)}</td>
                  <td className={cn(td, 'text-right')}>{totals.wonCount > 0 ? formatCurrency(totals.revenue / totals.wonCount) : '—'}</td>
                  <td className={cn(td, 'text-right')}>{conversion(totals.leadsWon, totals.leads) ?? '—'}</td>
                  <td className={cn(td, 'text-right')}>{totals.lostCount}</td>
                  <td className={td} />
                  <td className={cn(td, 'text-right pr-0')}>{totals.awaiting}</td>
                </tr>
              </tfoot>
            </table>
            <p className="pt-2 text-xs text-muted-foreground max-w-3xl">
              Vendido é a base da comissão: a soma das vendas fechadas no período, pela data da venda. Conversão olha só para
              os contatos recebidos no período e quantos deles já compraram. Clique num atendente para ver de onde vieram as
              vendas e por que perdeu.
            </p>
          </div>
        )}
      </Panel>

      {!loading && !failed && totals.awaiting > 0 && (
        <ReportNotice>
          <strong className="font-medium text-foreground">
            {totals.awaiting} {totals.awaiting === 1 ? 'conversa atribuída está' : 'conversas atribuídas estão'}
          </strong>{' '}
          com a última mensagem do contato e nenhuma resposta, nem da IA nem de uma pessoa. Este número é de agora,
          não do período selecionado.
        </ReportNotice>
      )}
    </>
  );
};

const AttendantDetails: React.FC<{ row: AttendantXrayRow }> = ({ row }) => (
  <div className="grid gap-4 md:grid-cols-3 rounded-lg bg-background/60 border border-border p-4">
    <section aria-label={`De onde vieram as vendas de ${row.name}`} className="flex flex-col gap-2 min-w-0">
      <h3 className="text-sm font-medium text-foreground">De onde vieram as vendas</h3>
      {row.salesByAd.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda fechada no período.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {row.salesByAd.map((s) => (
            <li key={s.ad ?? 'none'} className="flex items-baseline justify-between gap-3 text-sm">
              <span className={cn('truncate', s.ad ? 'text-foreground' : 'text-muted-foreground')} title={s.ad ?? undefined}>
                {adLabel(s.ad)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {s.count} {s.count === 1 ? 'venda' : 'vendas'}, <span className="text-foreground">{formatCurrency(s.revenue)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>

    <section aria-label={`Perdas de ${row.name}`} className="flex flex-col gap-2 min-w-0">
      <h3 className="text-sm font-medium text-foreground">Por que perdeu</h3>
      {row.lossReasons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum negócio marcado como perdido no período.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {row.lossReasons.map((r) => (
            <span key={r.label} className="text-xs text-foreground bg-muted px-2.5 py-1 rounded-full">{r.label} ({r.count})</span>
          ))}
        </div>
      )}
    </section>

    <section aria-label={`Ritmo de ${row.name}`} className="flex flex-col gap-2 min-w-0">
      <h3 className="text-sm font-medium text-foreground">Ritmo</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Contatos recebidos</dt>
        <dd className="text-right tabular-nums text-foreground">{row.leads}</dd>
        {row.viaNumber > 0 && (
          <>
            <dt className="text-muted-foreground">Pelo número de WhatsApp</dt>
            <dd className="text-right tabular-nums text-foreground">{row.viaNumber}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Em aberto agora</dt>
        <dd className="text-right tabular-nums text-foreground">{row.openNow}</dd>
        <dt className="text-muted-foreground">Mensagens pelo app</dt>
        <dd className="text-right tabular-nums text-foreground">{row.messagesSent}</dd>
      </dl>
      {row.viaNumber > 0 && (
        <p className="text-xs text-muted-foreground">
          Negócios sem responsável que entraram pelo número de WhatsApp que esta pessoa cuida.
        </p>
      )}
    </section>
  </div>
);

export default ResultsAttendance;
