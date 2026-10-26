import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  fetchAttendants,
  fetchTeamMembers,
  type Attendant,
  type CampaignLead,
  type TeamMemberRef,
} from '@/services/campaignScoreboardService';
import { formatCurrency } from '@/lib/formatCurrency';

/**
 * Detalhes de uma campanha: só quem fechou e quem atendeu cada um — a base
 * para premiação quando mais de uma pessoa atende o mesmo cliente.
 *
 * "Responsável" é deals.owner_id (primeira resposta pelo app, ou quem mudou
 * no funil); "Atendeu" é cada pessoa que mandou mensagem na conversa.
 */

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  /** "nos últimos 30 dias" / "em setembro de 2026" */
  periodLabel: string;
  /** Sales closed in the period (fetchCampaignWins), whenever the lead arrived. */
  leads: CampaignLead[];
}

interface PersonTotal {
  name: string;
  sales: number;
  revenue: number;
  participated: number;
}

export const CampaignWonDetails: React.FC<Props> = ({ open, onOpenChange, campaignName, periodLabel, leads }) => {
  const won = useMemo(
    () => leads.filter((l) => l.outcome === 'won').sort((a, b) => (b.wonAt ?? '').localeCompare(a.wonAt ?? '')),
    [leads],
  );
  const [members, setMembers] = useState<TeamMemberRef[]>([]);
  const [attendants, setAttendants] = useState<Map<string, Attendant[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || won.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const m = await fetchTeamMembers();
        const ids = [...new Set(won.map((l) => l.contactId).filter((id): id is string => !!id))];
        const a = await fetchAttendants(ids, m);
        if (cancelled) return;
        setMembers(m);
        setAttendants(a);
      } catch (error) {
        console.error('[campaigns] Error loading won details:', error);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, won]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const ownerName = (l: CampaignLead) => {
    const m = l.ownerId ? memberById.get(l.ownerId) : undefined;
    return m && !m.hidden ? m.name : null;
  };

  const totals = useMemo<PersonTotal[]>(() => {
    const map = new Map<string, PersonTotal>();
    const get = (name: string) => {
      let t = map.get(name);
      if (!t) map.set(name, (t = { name, sales: 0, revenue: 0, participated: 0 }));
      return t;
    };
    for (const l of won) {
      const owner = ownerName(l);
      if (owner) {
        const t = get(owner);
        t.sales += 1;
        t.revenue += l.value;
      }
      for (const a of (l.contactId && attendants.get(l.contactId)) || []) get(a.name).participated += 1;
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.participated - a.participated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, attendants, memberById]);

  const noOwner = won.filter((l) => !ownerName(l)).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quem fechou em {campaignName}</SheetTitle>
          <SheetDescription>
            {won.length === 0
              ? `Nenhuma venda fechada nesta campanha ${periodLabel}.`
              : `${won.length} ${won.length === 1 ? 'venda fechada' : 'vendas fechadas'} ${periodLabel}, ${formatCurrency(won.reduce((s, l) => s + l.value, 0))}. Conta pela data da venda, como o Faturamento por campanha.`}
          </SheetDescription>
        </SheetHeader>

        {won.length > 0 && (loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando atendimentos…
          </div>
        ) : failed ? (
          <p className="mt-6 text-sm text-foreground">Não foi possível carregar quem atendeu.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <section aria-label="Por atendente">
              <h4 className="text-sm font-semibold text-foreground mb-2">Por atendente</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th scope="col" className="py-2 pr-4 font-medium">Pessoa</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-right">Responsável</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-right">Valor</th>
                    <th scope="col" className="py-2 font-medium text-right">Atendeu</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.name} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">{t.name}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{t.sales || '—'}</td>
                      <td className="py-2 pr-4 text-right tabular-nums font-semibold">{t.revenue ? formatCurrency(t.revenue) : '—'}</td>
                      <td className="py-2 text-right tabular-nums">{t.participated || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Responsável é o dono do negócio no funil. Atendeu conta em quantas dessas vendas a pessoa mandou mensagem.
                {noOwner > 0 && ` ${noOwner} ${noOwner === 1 ? 'venda está' : 'vendas estão'} sem responsável.`}
              </p>
            </section>

            <section aria-label="Vendas">
              <h4 className="text-sm font-semibold text-foreground mb-2">Vendas</h4>
              <ul className="flex flex-col gap-2">
                {won.map((l) => {
                  const people = (l.contactId && attendants.get(l.contactId)) || [];
                  return (
                    <li key={l.dealId} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-foreground">{l.contactName}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(l.value)}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Chamou {l.createdAt ? dateFmt.format(new Date(l.createdAt)) : '—'}</span>
                        <span>Fechou {l.wonAt ? dateFmt.format(new Date(l.wonAt)) : '—'}{l.lu?.applied && ' (marcado pela Lu)'}</span>
                        <span>Responsável: {ownerName(l) ?? 'ninguém'}</span>
                        {l.phone && (
                          <Link to={`/chat?contact=${encodeURIComponent(l.phone)}`} className="font-semibold text-primary hover:underline">
                            Abrir conversa
                          </Link>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {people.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhuma resposta da equipe registrada.</span>
                        ) : people.map((a) => (
                          <span
                            key={a.memberId ?? a.name}
                            title={`De ${dateFmt.format(new Date(a.firstAt))} a ${dateFmt.format(new Date(a.lastAt))}`
                              + (a.memberId && a.phoneMessages > 0 ? ` · ${a.phoneMessages} pelo celular, ${a.messages - a.phoneMessages} pelo sistema` : '')}
                            className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-full"
                          >
                            {a.name} · {a.messages} {a.messages === 1 ? 'msg' : 'msgs'}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        ))}
      </SheetContent>
    </Sheet>
  );
};

export default CampaignWonDetails;
