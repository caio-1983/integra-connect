import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { api } from '@/services/api';
import { fetchCampaigns, updateCampaign } from '@/services/attributionService';
import { PERIOD_PRESETS, resolvePeriod, type PeriodPreset } from '@/services/analyticsService';
import { fetchCampaignLeads, type CampaignLead, type LeadOutcome } from '@/services/campaignScoreboardService';
import { formatCurrency } from '@/lib/formatCurrency';
import type { Campaign } from '@/types';

/**
 * "Qual campanha vale a pena manter?" — every lead a campaign brought in the
 * period, one mark per person, and what happened to each of them.
 *
 * The marks are the point: a percentage hides that "18%" can be 2 of 11 or 11 of
 * 62. Seeing the people is what lets a manager trust the call to end a campaign.
 */

type Verdict = 'good' | 'early' | 'bad';

/** Below this many leads, or while most are still being negotiated, a close
 *  rate says nothing yet. */
const MIN_LEADS = 10;
/** One sale per ten leads. Without spend data this is the only fair bar
 *  between campaigns; revisit once investment per campaign is recorded. */
const GOOD_CLOSE_RATE = 0.1;
const MAX_DOTS = 150;
const PEOPLE_PREVIEW = 8;

const VERDICT_LABEL: Record<Verdict, string> = {
  good: 'Rende',
  early: 'Cedo para dizer',
  bad: 'Não está rendendo',
};

const VERDICT_CLASS: Record<Verdict, string> = {
  good: 'bg-success-subtle text-success',
  early: 'bg-muted text-muted-foreground',
  bad: 'bg-warning-subtle text-warning',
};

const OUTCOME_CLASS: Record<LeadOutcome, string> = {
  won: 'bg-success-subtle text-success',
  open: 'bg-info-subtle text-info',
  lost: 'bg-warning-subtle text-warning',
};

interface CampaignGroup {
  id: string;
  name: string;
  campaign: Campaign | undefined;
  leads: CampaignLead[];
  won: number;
  open: number;
  lost: number;
  revenue: number;
  verdict: Verdict;
}

function verdictFor(won: number, open: number, lost: number): Verdict {
  const total = won + open + lost;
  if (total < MIN_LEADS || won + lost < total / 2) return 'early';
  return won / total >= GOOD_CLOSE_RATE ? 'good' : 'bad';
}

function closeRatio(won: number, total: number): string {
  return won === 0 ? 'nenhum' : `1 em ${Math.round(total / won)}`;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isEnded(campaign: Campaign | undefined): boolean {
  return !!campaign?.endedAt && campaign.endedAt <= todayLocal();
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const shortDate = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/');

/** "nos últimos 30 dias" / "em setembro de 2026" — period labels need their own preposition. */
function inPeriod(label: string): string {
  return label.startsWith('últimos') ? `nos ${label}` : `em ${label}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

const Mark: React.FC<{ outcome: LeadOutcome }> = ({ outcome }) => {
  if (outcome === 'won') return <span className="w-2.5 h-2.5 rounded-full bg-primary" />;
  if (outcome === 'open') return <span className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground" />;
  return <span className="w-2.5 h-2.5 rounded-sm bg-warning/40" />;
};

export const CampaignScoreboard: React.FC = () => {
  const [preset, setPreset] = useState<PeriodPreset>('30d');
  const period = useMemo(() => resolvePeriod(preset), [preset]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lossLabels, setLossLabels] = useState<Map<string, string>>(new Map());
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<CampaignGroup | null>(null);
  const [ending, setEnding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [c, reasons] = await Promise.all([fetchCampaigns(), api.fetchLossReasons()]);
      setCampaigns(c);
      setLossLabels(new Map(reasons.map((r) => [r.key, r.label])));
      setLeads(await fetchCampaignLeads(period, new Map(c.map((x) => [x.id, x.name]))));
    } catch (error) {
      console.error('[campaigns] Error loading scoreboard:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo<CampaignGroup[]>(() => {
    const campaignById = new Map(campaigns.map((c) => [c.id, c]));
    const byId = new Map<string, CampaignLead[]>();
    for (const lead of leads) {
      if (!lead.campaignId) continue;
      const list = byId.get(lead.campaignId);
      if (list) list.push(lead);
      else byId.set(lead.campaignId, [lead]);
    }
    return [...byId.entries()]
      .map(([id, list]) => {
        const won = list.filter((l) => l.outcome === 'won');
        const open = list.filter((l) => l.outcome === 'open').length;
        const lost = list.filter((l) => l.outcome === 'lost').length;
        return {
          id,
          name: campaignById.get(id)?.name ?? list[0].campaignName ?? 'Campanha',
          campaign: campaignById.get(id),
          leads: list,
          won: won.length,
          open,
          lost,
          revenue: won.reduce((sum, l) => sum + l.value, 0),
          verdict: verdictFor(won.length, open, lost),
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.won - a.won || b.leads.length - a.leads.length);
  }, [leads, campaigns]);

  const unmappedCount = useMemo(() => leads.filter((l) => !l.campaignId).length, [leads]);

  // Default to the campaign that most needs a decision: the worst performer if
  // there is one, otherwise the top seller.
  const selected = useMemo(() => {
    const explicit = groups.find((g) => g.id === selectedId);
    if (explicit) return explicit;
    const bad = groups.filter((g) => g.verdict === 'bad').sort((a, b) => b.leads.length - a.leads.length);
    return bad[0] ?? groups[0] ?? null;
  }, [groups, selectedId]);

  const summary = useMemo(() => {
    if (groups.length === 0) return '';
    const total = groups.reduce((sum, g) => sum + g.revenue, 0);
    const parts: string[] = [];
    if (total === 0) {
      const people = groups.reduce((sum, g) => sum + g.leads.length, 0);
      parts.push(`Nenhuma venda fechada ainda entre as ${people} pessoas que chamaram por campanha ${inPeriod(period.label)}.`);
    } else {
      const top = groups.filter((g) => g.revenue > 0).slice(0, 2);
      const share = Math.round((top.reduce((sum, g) => sum + g.revenue, 0) / total) * 100);
      if (groups.length === 1) {
        parts.push(`${capitalize(inPeriod(period.label))}, ${top[0].name} vendeu ${formatCurrency(top[0].revenue)}.`);
      } else {
        parts.push(`${capitalize(inPeriod(period.label))}, ${joinNames(top.map((g) => g.name))} ${top.length > 1 ? 'trouxeram' : 'trouxe'} ${share}% do que foi vendido por campanha.`);
      }
    }
    const worst = groups.filter((g) => g.verdict === 'bad').sort((a, b) => b.leads.length - a.leads.length)[0];
    if (worst) {
      parts.push(`${worst.name} recebeu ${worst.leads.length} contatos e fechou ${worst.won === 0 ? 'nenhum negócio' : worst.won === 1 ? 'só 1 negócio' : `${worst.won} negócios`}.`);
    }
    return parts.join(' ');
  }, [groups, period.label]);

  const handleEnd = async () => {
    if (!confirmEnd) return;
    setEnding(true);
    try {
      // Ends by date, never by is_active: the attribution view only maps leads
      // to ACTIVE campaigns, so deactivating would orphan the whole history.
      await updateCampaign(confirmEnd.id, { endedAt: todayLocal() });
      toast.success(`${confirmEnd.name} encerrada.`);
      setConfirmEnd(null);
      setCampaigns(await fetchCampaigns());
    } catch {
      toast.error('Não foi possível encerrar a campanha.');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground leading-tight">
            Qual campanha vale a pena manter?
          </h2>
          {!loading && summary && (
            <p className="text-base leading-relaxed text-muted-foreground">{summary}</p>
          )}
        </div>
        <Select value={preset} onValueChange={(v) => { setPreset(v as PeriodPreset); setSelectedId(null); setShowAllPeople(false); }}>
          <SelectTrigger className="h-9 w-40" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando campanhas…
        </div>
      ) : failed ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <span className="text-foreground">Não foi possível carregar os contatos das campanhas.</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>Tentar de novo</Button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhum contato de campanha neste período"
          description={unmappedCount > 0
            ? `${unmappedCount} pessoas chegaram por anúncios que ainda não pertencem a nenhuma campanha. Vincule esses sinais para que apareçam aqui.`
            : 'Quando alguém chamar por um anúncio ligado a uma campanha, aparece aqui com o resultado da negociação.'}
        />
      ) : (
        <>
          <section aria-label="Placar das campanhas" className="rounded-xl border border-border bg-card p-2">
            <div className="hidden md:grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_6rem_8rem_10rem] gap-5 px-4 pt-3 pb-2 text-xs text-muted-foreground items-center">
              <span>Campanha</span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                Cada marca é uma pessoa que chamou
                <span className="inline-flex items-center gap-1.5"><Mark outcome="won" />fechou</span>
                <span className="inline-flex items-center gap-1.5"><Mark outcome="open" />em negociação</span>
                <span className="inline-flex items-center gap-1.5"><Mark outcome="lost" />não fechou</span>
              </span>
              <span className="text-right">Fecha</span>
              <span className="text-right">Vendido</span>
              <span>Avaliação</span>
            </div>

            <ul className="flex flex-col">
              {groups.map((g) => {
                const total = g.leads.length;
                const isSelected = selected?.id === g.id;
                const ended = isEnded(g.campaign);
                const marks = g.leads
                  .map((l) => l.outcome)
                  .sort((a, b) => ['won', 'open', 'lost'].indexOf(a) - ['won', 'open', 'lost'].indexOf(b));
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => { setSelectedId(g.id); setShowAllPeople(false); }}
                      aria-pressed={isSelected}
                      className={`w-full text-left rounded-lg px-4 py-3.5 grid gap-3 md:gap-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_6rem_8rem_10rem] md:items-center transition-colors ${
                        isSelected ? 'bg-primary-subtle/40 ring-2 ring-inset ring-primary' : 'hover:bg-accent'
                      }`}
                    >
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[15px] font-semibold text-foreground truncate">{g.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {ended && g.campaign?.endedAt
                            ? `Encerrada em ${shortDate(g.campaign.endedAt)}`
                            : g.campaign?.channel || `${total} ${total === 1 ? 'pessoa' : 'pessoas'}`}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1 content-center" aria-hidden="true">
                        {marks.slice(0, MAX_DOTS).map((o, i) => <Mark key={i} outcome={o} />)}
                        {total > MAX_DOTS && <span className="text-xs text-muted-foreground ml-1">+{total - MAX_DOTS}</span>}
                      </span>
                      <span className="sr-only">
                        {g.won} fecharam, {g.open} em negociação, {g.lost} não fecharam.
                      </span>
                      <span className="flex md:flex-col md:items-end gap-2 md:gap-0.5 items-baseline">
                        <span className="text-[15px] font-semibold text-foreground tabular-nums">{closeRatio(g.won, total)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{g.won} de {total}</span>
                      </span>
                      <span className="md:text-right text-[15px] font-semibold text-foreground tabular-nums">{formatCurrency(g.revenue)}</span>
                      <span>
                        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${VERDICT_CLASS[g.verdict]}`}>
                          {VERDICT_LABEL[g.verdict]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground max-w-4xl">
              Conta quem chamou {inPeriod(period.label)} e o que aconteceu com cada pessoa até hoje. Com pelo menos {MIN_LEADS} contatos
              e a maioria já decidida, uma campanha que fecha menos de 1 em cada {Math.round(1 / GOOD_CLOSE_RATE)} aparece como “não está rendendo”.
            </p>

            {unmappedCount > 0 && (
              <Link
                to="/campanhas/configurar"
                className="mx-2 mt-2 flex flex-wrap justify-between gap-2 rounded-lg bg-warning-subtle px-3.5 py-3 text-sm text-warning hover:underline"
              >
                <span>
                  {unmappedCount} {unmappedCount === 1 ? 'pessoa chegou' : 'pessoas chegaram'} por anúncios que ainda não têm campanha e
                  {unmappedCount === 1 ? ' fica' : ' ficam'} fora deste placar.
                </span>
                <span className="font-semibold">Vincular sinais</span>
              </Link>
            )}
          </section>

          {selected && (
            <SelectedCampaign
              group={selected}
              lossLabels={lossLabels}
              showAll={showAllPeople}
              onShowAll={() => setShowAllPeople(true)}
              onEnd={() => setConfirmEnd(selected)}
            />
          )}
        </>
      )}

      <AlertDialog open={!!confirmEnd} onOpenChange={(open) => { if (!open) setConfirmEnd(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar {confirmEnd?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha fica marcada como encerrada hoje e as pessoas que já chegaram por ela continuam contando no histórico.
              O anúncio continua no ar até você pausar no Gerenciador de Anúncios da Meta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleEnd(); }} disabled={ending}>
              {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Encerrar campanha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface SelectedCampaignProps {
  group: CampaignGroup;
  lossLabels: Map<string, string>;
  showAll: boolean;
  onShowAll: () => void;
  onEnd: () => void;
}

const SelectedCampaign: React.FC<SelectedCampaignProps> = ({ group, lossLabels, showAll, onShowAll, onEnd }) => {
  const total = group.leads.length;
  const people = useMemo(
    () => [...group.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [group.leads],
  );
  const visible = showAll ? people : people.slice(0, PEOPLE_PREVIEW);

  const reasons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of group.leads) {
      if (l.outcome !== 'lost') continue;
      const label = (l.lostReasonCode && lossLabels.get(l.lostReasonCode)) || 'Sem motivo informado';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [group.leads, lossLabels]);

  const outcomeText = (l: CampaignLead) => {
    if (l.outcome === 'won') return 'Fechou';
    if (l.outcome === 'open') return 'Em negociação';
    const reason = l.lostReasonCode && lossLabels.get(l.lostReasonCode);
    return reason ? `Não fechou: ${reason.toLowerCase()}` : 'Não fechou';
  };

  const canEnd = group.verdict === 'bad' && !!group.campaign && !isEnded(group.campaign);

  return (
    <section aria-label={`Contatos de ${group.name}`} className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-border">
        <div className="flex flex-col gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Quem chegou por {group.name}</h3>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'pessoa chamou' : 'pessoas chamaram'}. {group.won === 0 ? 'Nenhuma comprou' : `${group.won} ${group.won === 1 ? 'comprou' : 'compraram'}`}
            {group.open > 0 && `, ${group.open} ${group.open === 1 ? 'ainda está' : 'ainda estão'} em negociação`}.
          </p>
          {reasons.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Por que não fecharam:</span>
              {reasons.map(([label, n]) => (
                <span key={label} className="text-xs text-foreground bg-muted px-2.5 py-1 rounded-full">{label} ({n})</span>
              ))}
            </div>
          )}
        </div>
        {canEnd && (
          <div className="flex flex-col items-end gap-1.5">
            <Button variant="danger" onClick={onEnd}>Encerrar campanha</Button>
            <span className="text-xs text-muted-foreground max-w-[16rem] text-right">
              O anúncio continua no ar até você pausar na Meta.
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Pessoas que chegaram por {group.name} e a situação de cada uma</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th scope="col" className="py-2.5 px-5 font-medium">Pessoa</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Chamou em</th>
              <th scope="col" className="hidden md:table-cell py-2.5 pr-4 font-medium">Anúncio</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Situação</th>
              <th scope="col" className="py-2.5 pr-4 font-medium text-right">Valor</th>
              <th scope="col" className="py-2.5 pr-5"><span className="sr-only">Conversa</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => (
              <tr key={l.dealId} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 px-5 font-medium text-foreground min-w-[9rem]">{l.contactName}</td>
                <td className="py-2.5 pr-4 text-muted-foreground tabular-nums whitespace-nowrap">
                  {l.createdAt ? dateTime.format(new Date(l.createdAt)) : '—'}
                </td>
                <td className="hidden md:table-cell py-2.5 pr-4 text-muted-foreground">{l.adName ?? '—'}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full ${OUTCOME_CLASS[l.outcome]}`}>
                    {outcomeText(l)}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                  {l.outcome === 'won' ? formatCurrency(l.value) : ''}
                </td>
                <td className="py-2.5 pr-5 text-right">
                  {l.phone && (
                    <Link to={`/chat?contact=${encodeURIComponent(l.phone)}`} className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                      Abrir conversa
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && total > PEOPLE_PREVIEW && (
        <div className="px-5 py-3 border-t border-border">
          <button type="button" onClick={onShowAll} className="text-sm font-semibold text-primary hover:underline">
            Ver todas as {total} pessoas
          </button>
        </div>
      )}
    </section>
  );
};

export default CampaignScoreboard;
