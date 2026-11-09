import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Megaphone, Search } from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import type { Period } from '@/services/analyticsService';
import type { CampaignLead, LeadOutcome } from '@/services/campaignScoreboardService';
import { formatCurrency } from '@/lib/formatCurrency';
import { AD_STATUS_LABEL, adCode, liveliestStatus, readableAdName } from '@/lib/adName';
import { CampaignWonDetails } from '@/components/campaigns/CampaignWonDetails';

/**
 * The ad scoreboard itself, fed with data by CampaignScoreboard.
 *
 * Read top to bottom it answers, in order: which ads sell (by money), which
 * ones bring people but never sold (by contacts — the ones that need a call),
 * and what arrived without an ad. Zeros and "too early" are drawn quietly so
 * the few rows that say something stand out; details open right under the
 * row clicked.
 */

type Verdict = 'good' | 'early' | 'bad';
type StatusFilter = 'all' | 'active' | 'paused';

/** Below this many leads, or while most are still being negotiated, a close
 *  rate says nothing yet. */
export const MIN_LEADS = 10;
/** One sale per ten leads. Without spend data this is the only fair bar
 *  between ads; revisit once investment per ad is recorded. */
export const GOOD_CLOSE_RATE = 0.1;
const PEOPLE_PREVIEW = 8;
const MAX_WEEKS = 16;
const BAR_HEIGHT = 32;
const WEEK_MS = 7 * 86_400_000;

const VERDICT_LABEL: Record<Verdict, string> = {
  good: 'Rende',
  early: 'Cedo para dizer',
  bad: 'Não está rendendo',
};

const OUTCOME_CLASS: Record<LeadOutcome, string> = {
  won: 'bg-success-subtle text-success',
  open: 'bg-info-subtle text-info',
  lost: 'bg-warning-subtle text-warning',
};

/** fechou / em negociação / não fechou differ in lightness, not hue alone. */
const BAR_CLASS: Record<LeadOutcome, string> = {
  won: 'bg-primary',
  open: 'bg-info/35',
  lost: 'bg-warning/45',
};

const COLS = 'md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_5.5rem_7.5rem_8.5rem]';

export interface ScoreGroup {
  key: string;
  kind: 'ad' | 'origin';
  /** Plain-words name ("Sanca"), or the origin's name. */
  name: string;
  /** Name exactly as in Ads Manager. */
  raw: string | null;
  code: string | null;
  status: string | null;
  createdAt: string | null;
  adIds: Set<string>;
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

const closeRatio = (won: number, total: number) => `1 em ${Math.round(total / won)}`;

function groupKey(lead: CampaignLead): string | null {
  if (lead.ad) return lead.ad.name ? `ad:${lead.ad.name}` : `adid:${lead.ad.id}`;
  return lead.campaignId ? `origin:${lead.campaignId}` : null;
}

/** "Perfil de LED (ad08)" — the code tells apart ads with the same theme. */
const groupLabel = (g: ScoreGroup) => (g.code ? `${g.name} (${g.code})` : g.name);

const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** "há 7 meses", "há 1 ano e 3 meses", "há 6 dias". */
function ago(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days < 14) return days <= 1 ? 'há 1 dia' : `há ${days} dias`;
  if (days < 60) return `há ${Math.round(days / 7)} semanas`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `há ${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months - years * 12;
  return `há ${years === 1 ? '1 ano' : `${years} anos`}${rest ? ` e ${rest} ${rest === 1 ? 'mês' : 'meses'}` : ''}`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function startOfWeek(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const Swatch: React.FC<{ outcome: LeadOutcome }> = ({ outcome }) => (
  <span className={`w-2.5 h-2.5 rounded-sm ${BAR_CLASS[outcome]}`} aria-hidden="true" />
);

const StatusChip: React.FC<{ status: string | null }> = ({ status }) => (
  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
    status === 'ACTIVE' ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-muted text-muted-foreground'
  }`}>
    {status ? AD_STATUS_LABEL[status] ?? status : 'Sem acesso na Meta'}
  </span>
);

const VerdictText: React.FC<{ verdict: Verdict }> = ({ verdict }) => {
  if (verdict === 'early') return <span className="text-xs text-muted-foreground">{VERDICT_LABEL.early}</span>;
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
      verdict === 'good' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
    }`}>
      {VERDICT_LABEL[verdict]}
    </span>
  );
};

export interface ScoreboardViewProps {
  leads: CampaignLead[];
  wins: CampaignLead[];
  lossLabels: Map<string, string>;
  period: Period;
  /** "desde o início" / "em setembro de 2026", ready to drop into a sentence. */
  periodText: string;
  /** All-time view: the cohort and the sales-date counts are the same set. */
  allTime: boolean;
  /** The period picker, drawn next to the title. */
  periodControl: React.ReactNode;
  status: 'loading' | 'failed' | 'ready';
  onRetry: () => void;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({
  leads, wins, lossLabels, period, periodText, allTime, periodControl, status, onRetry,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [showAllPeople, setShowAllPeople] = useState(false);
  const [detailsFor, setDetailsFor] = useState<ScoreGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const winsByGroup = useMemo(() => {
    const map = new Map<string, CampaignLead[]>();
    for (const w of wins) {
      const key = groupKey(w);
      if (key) map.set(key, [...(map.get(key) ?? []), w]);
    }
    return map;
  }, [wins]);

  const groups = useMemo<ScoreGroup[]>(() => {
    const byKey = new Map<string, ScoreGroup>();
    for (const lead of leads) {
      const key = groupKey(lead);
      if (!key) continue;
      let g = byKey.get(key);
      if (!g) {
        const ad = lead.ad;
        g = {
          key,
          kind: ad ? 'ad' : 'origin',
          name: ad ? (ad.name ? readableAdName(ad.name) : 'Anúncio sem nome') : lead.campaignName ?? 'Origem sem nome',
          raw: ad ? ad.name ?? 'A Meta não liberou a consulta deste anúncio' : null,
          code: ad?.name ? adCode(ad.name) : null,
          status: ad?.status ?? null,
          createdAt: ad?.createdAt ?? null,
          adIds: new Set(),
          leads: [],
          won: 0, open: 0, lost: 0, revenue: 0, verdict: 'early',
        };
        byKey.set(key, g);
      }
      if (lead.ad) {
        g.adIds.add(lead.ad.id);
        g.status = liveliestStatus(g.status, lead.ad.status);
        if (lead.ad.createdAt && (!g.createdAt || lead.ad.createdAt < g.createdAt)) g.createdAt = lead.ad.createdAt;
      }
      g.leads.push(lead);
      g[lead.outcome] += 1;
      if (lead.outcome === 'won') g.revenue += lead.value;
    }
    const all = [...byKey.values()];
    for (const g of all) g.verdict = verdictFor(g.won, g.open, g.lost);
    return all;
  }, [leads]);

  const counts = useMemo(() => {
    const ads = groups.filter((g) => g.kind === 'ad');
    return {
      all: groups.length,
      active: ads.filter((g) => g.status === 'ACTIVE').length,
      paused: ads.filter((g) => g.status !== 'ACTIVE').length,
    };
  }, [groups]);

  // Three readings, each in the order its question needs.
  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const shown = groups.filter((g) => {
      if (statusFilter === 'active' && (g.kind !== 'ad' || g.status !== 'ACTIVE')) return false;
      if (statusFilter === 'paused' && (g.kind !== 'ad' || g.status === 'ACTIVE')) return false;
      if (!term) return true;
      return g.name.toLowerCase().includes(term) || (g.raw ?? '').replace(/_/g, ' ').toLowerCase().includes(term);
    });
    const byMoney = (a: ScoreGroup, b: ScoreGroup) => b.revenue - a.revenue || b.won - a.won || b.leads.length - a.leads.length;
    const byPeople = (a: ScoreGroup, b: ScoreGroup) => b.leads.length - a.leads.length;
    return [
      {
        id: 'selling',
        title: 'Já venderam',
        hint: 'Do que mais vendeu para o que menos vendeu.',
        items: shown.filter((g) => g.kind === 'ad' && g.won > 0).sort(byMoney),
      },
      {
        id: 'silent',
        title: 'Ainda sem venda',
        hint: 'Do que mais trouxe contatos para o que menos trouxe.',
        items: shown.filter((g) => g.kind === 'ad' && g.won === 0).sort(byPeople),
      },
      {
        id: 'origins',
        title: 'Sem anúncio',
        hint: 'Quem chegou pela frase ou pelo link de uma origem sem anúncio.',
        items: shown.filter((g) => g.kind === 'origin').sort(byMoney),
      },
    ].filter((s) => s.items.length > 0);
  }, [groups, statusFilter, search]);

  // Weekly bars: from the first lead (or the period start) to today, at most
  // MAX_WEEKS, the most recent ones. One scale for every row, so a busy ad and
  // a quiet one compare at a glance.
  const weeks = useMemo(() => {
    const end = Math.min(period.to.getTime(), Date.now());
    const firstLead = leads.reduce((min, l) => (l.createdAt ? Math.min(min, new Date(l.createdAt).getTime()) : min), end);
    const from = startOfWeek(Math.max(period.from.getTime(), firstLead));
    const count = Math.min(MAX_WEEKS, Math.max(1, Math.ceil((end - from) / WEEK_MS)));
    return { start: startOfWeek(end) - (count - 1) * WEEK_MS, count };
  }, [leads, period]);

  const bars = useMemo(() => {
    const perGroup = new Map<string, Array<Record<LeadOutcome, number>>>();
    let max = 1;
    for (const g of groups) {
      const cells = Array.from({ length: weeks.count }, () => ({ won: 0, open: 0, lost: 0 }));
      for (const l of g.leads) {
        const i = Math.floor((new Date(l.createdAt).getTime() - weeks.start) / WEEK_MS);
        if (i >= 0 && i < weeks.count) cells[i][l.outcome] += 1;
      }
      for (const c of cells) max = Math.max(max, c.won + c.open + c.lost);
      perGroup.set(g.key, cells);
    }
    return { perGroup, max };
  }, [groups, weeks]);

  const summary = useMemo(() => {
    if (groups.length === 0) return '';
    const total = groups.reduce((sum, g) => sum + g.revenue, 0);
    const parts: string[] = [];
    if (total === 0) {
      const people = groups.reduce((sum, g) => sum + g.leads.length, 0);
      parts.push(`Nenhuma venda fechada ainda entre as ${people} pessoas que chamaram por anúncio ${periodText}.`);
    } else {
      const top = groups.filter((g) => g.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 2);
      const share = Math.round((top.reduce((sum, g) => sum + g.revenue, 0) / total) * 100);
      parts.push(`${capitalize(periodText)}, ${joinNames(top.map(groupLabel))} ${top.length > 1 ? 'trouxeram' : 'trouxe'} ${share}% do que foi vendido.`);
    }
    const worst = groups.filter((g) => g.verdict === 'bad').sort((a, b) => b.leads.length - a.leads.length)[0]
      ?? groups.filter((g) => g.kind === 'ad' && g.won === 0 && g.leads.length >= MIN_LEADS).sort((a, b) => b.leads.length - a.leads.length)[0];
    if (worst) {
      parts.push(`${groupLabel(worst)} recebeu ${worst.leads.length} contatos e fechou ${worst.won === 0 ? 'nenhum negócio' : worst.won === 1 ? 'só 1 negócio' : `${worst.won} negócios`}.`);
    }
    return parts.join(' ');
  }, [groups, periodText]);

  const axisLabels = Array.from({ length: weeks.count }, (_, i) => {
    const step = weeks.count > 8 ? 4 : 2;
    return i % step === 0 ? dayMonth.format(new Date(weeks.start + i * WEEK_MS)) : '';
  });

  const toggle = (key: string) => {
    setOpenKey((current) => (current === key ? null : key));
    setShowAllPeople(false);
  };

  const pill = (key: StatusFilter, label: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={statusFilter === key}
      onClick={() => setStatusFilter(key)}
      className={`h-9 px-3.5 rounded-full text-sm border transition-colors ${
        statusFilter === key
          ? 'bg-primary-subtle text-primary-subtle-foreground border-transparent font-semibold'
          : 'bg-card text-foreground border-border hover:bg-accent'
      }`}
    >
      {label} ({counts[key]})
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground leading-tight">
            Qual anúncio vale a pena manter?
          </h2>
          {status === 'ready' && summary && (
            <p className="text-base leading-relaxed text-muted-foreground">{summary}</p>
          )}
        </div>
        {periodControl}
      </div>

      {status === 'loading' ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" aria-hidden="true" />
          Carregando anúncios…
        </div>
      ) : status === 'failed' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <span className="text-foreground">Não foi possível carregar os contatos dos anúncios.</span>
          <Button variant="outline" size="sm" onClick={onRetry}>Tentar de novo</Button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Ninguém chamou por anúncio neste período"
          description="Quando alguém clicar num anúncio da Meta e chamar no WhatsApp, o anúncio aparece aqui sozinho, com o resultado da negociação."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pelo status na Meta">
              {pill('all', 'Todos')}
              {pill('active', 'No ar')}
              {pill('paused', 'Pausados')}
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar pelo nome, ex.: perfil de led"
                aria-label="Buscar pelo nome do anúncio"
                className="pl-9 h-9"
              />
            </div>
          </div>

          <section aria-label="Placar dos anúncios" className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 pb-3 text-xs text-muted-foreground border-b border-border">
              <span>Cada barra é uma semana de contatos:</span>
              <span className="inline-flex items-center gap-1.5"><Swatch outcome="won" />fechou</span>
              <span className="inline-flex items-center gap-1.5"><Swatch outcome="open" />em negociação</span>
              <span className="inline-flex items-center gap-1.5"><Swatch outcome="lost" />não fechou</span>
            </div>

            <div className={`hidden md:grid ${COLS} gap-4 pl-6 pr-[8.5rem] pt-3 text-xs text-muted-foreground items-end`}>
              <span>Anúncio</span>
              <span className="flex gap-[3px] text-[11px]" aria-hidden="true">
                {axisLabels.map((label, i) => (
                  <span key={i} className="flex-1 min-w-0 whitespace-nowrap">{label}</span>
                ))}
              </span>
              <span className="text-right">Fecha</span>
              <span className="text-right">Vendido</span>
              <span>Avaliação</span>
            </div>

            {sections.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nenhum anúncio com esse filtro. Tente outra palavra ou volte para Todos.
              </p>
            ) : sections.map((section) => (
              <div key={section.id} className="px-2 pb-2">
                <div className="flex flex-wrap items-baseline gap-x-2 px-4 pt-5 pb-2">
                  <h3 className="text-[15px] font-semibold text-foreground">
                    {section.title} <span className="font-normal text-muted-foreground tabular-nums">({section.items.length})</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">{section.hint}</span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {section.items.map((g) => {
                    const total = g.leads.length;
                    const isOpen = openKey === g.key;
                    const cells = bars.perGroup.get(g.key) ?? [];
                    const createdMs = g.createdAt ? new Date(g.createdAt).getTime() : null;
                    const detailsId = `ad-details-${g.key.replace(/[^a-z0-9]/gi, '-')}`;
                    return (
                      <li key={g.key} className="flex flex-col">
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggle(g.key)}
                            aria-expanded={isOpen}
                            aria-controls={detailsId}
                            className={`flex-1 min-w-0 text-left rounded-lg px-4 py-3 grid grid-cols-3 items-baseline gap-x-3 gap-y-2 md:gap-4 ${COLS} md:items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isOpen ? 'bg-primary-subtle/40' : 'hover:bg-accent'
                            }`}
                          >
                            <span className="col-span-3 md:col-span-1 flex flex-col gap-1 min-w-0" title={g.raw ?? undefined}>
                              <span className="flex items-center gap-1.5 min-w-0">
                                <ChevronDown
                                  className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                                  aria-hidden="true"
                                />
                                <span className="text-[15px] font-semibold text-foreground truncate">{g.name}</span>
                                {g.code && <span className="text-xs text-muted-foreground shrink-0">{g.code}</span>}
                              </span>
                              {g.kind === 'ad' ? (
                                <span className="flex flex-wrap items-center gap-1.5 pl-[22px]">
                                  <StatusChip status={g.status} />
                                  {g.createdAt && (
                                    <span className="text-xs text-muted-foreground">Criado em {fullDate.format(new Date(g.createdAt))}</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground pl-[22px]">Origem sem anúncio</span>
                              )}
                            </span>
                            <span className="col-span-3 md:col-span-1 flex items-end gap-[3px] h-8" aria-hidden="true">
                              {cells.map((c, i) => {
                                const n = c.won + c.open + c.lost;
                                // A sale is the thing to spot: never thinner than 4px.
                                const h = n ? Math.max(c.won ? 6 : 3, Math.round(BAR_HEIGHT * Math.sqrt(n / bars.max))) : 0;
                                const part = (x: number) => (n && x ? Math.max(x === c.won ? 4 : 2, Math.round((h * x) / n)) : 0);
                                const weekStart = weeks.start + i * WEEK_MS;
                                const beforeAd = createdMs !== null && createdMs >= weekStart + WEEK_MS;
                                return (
                                  <span
                                    key={i}
                                    title={`Semana de ${dayMonth.format(new Date(weekStart))}: ${n} ${n === 1 ? 'contato' : 'contatos'}${c.won ? `, ${c.won} fechou` : ''}`}
                                    className={`flex-1 min-w-0 h-full flex flex-col justify-end border-b ${beforeAd ? 'border-transparent' : 'border-border'}`}
                                  >
                                    <span className={BAR_CLASS.lost} style={{ height: part(c.lost) }} />
                                    <span className={BAR_CLASS.open} style={{ height: n ? Math.max(0, h - part(c.won) - part(c.lost)) : 0 }} />
                                    <span className={BAR_CLASS.won} style={{ height: part(c.won) }} />
                                  </span>
                                );
                              })}
                            </span>
                            <span className="sr-only col-span-3 md:col-span-1">
                              {total} contatos: {g.won} fecharam, {g.open} em negociação, {g.lost} não fecharam.
                            </span>
                            {g.won > 0 ? (
                              <span className="flex flex-col md:items-end gap-0.5">
                                <span className="text-[15px] font-semibold text-foreground tabular-nums">{closeRatio(g.won, total)}</span>
                                <span className="text-xs text-muted-foreground tabular-nums">{g.won} de {total}</span>
                              </span>
                            ) : (
                              <span className="md:text-right text-sm text-muted-foreground tabular-nums">0 de {total}</span>
                            )}
                            <span className="md:text-right tabular-nums">
                              {g.revenue > 0
                                ? <span className="text-[15px] font-semibold text-foreground">{formatCurrency(g.revenue)}</span>
                                : <span className="text-[15px] text-muted-foreground" aria-label="nada vendido">—</span>}
                            </span>
                            <span><VerdictText verdict={g.verdict} /></span>
                          </button>
                          {/* Only rows with a sale have someone to reward; the
                              empty slot keeps the columns aligned. */}
                          {winsByGroup.has(g.key) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="self-start md:self-center ml-4 md:ml-0 md:mr-2 md:w-24 shrink-0"
                              onClick={() => setDetailsFor(g)}
                              aria-label={`Quem fechou em ${g.name}`}
                            >
                              Detalhes
                            </Button>
                          ) : (
                            <span className="hidden md:block md:w-24 md:mr-2 shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        {isOpen && (
                          <div id={detailsId} className="mt-1 mb-3 md:mx-2">
                            <GroupDetails
                              group={g}
                              lossLabels={lossLabels}
                              showAll={showAllPeople}
                              onShowAll={() => setShowAllPeople(true)}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <p className="px-6 pt-2 pb-4 text-xs leading-relaxed text-muted-foreground max-w-3xl">
              {allTime
                ? 'Conta todo mundo que já chamou por anúncio e o que aconteceu com cada pessoa até hoje.'
                : `Conta quem chamou ${periodText} e o que aconteceu até hoje; Detalhes mostra as vendas fechadas ${periodText}.`}{' '}
              “Não está rendendo” aparece com {MIN_LEADS} contatos ou mais, a maioria já decidida e menos de 1 venda em cada{' '}
              {Math.round(1 / GOOD_CLOSE_RATE)}. Quem chega sem anúncio entra pelas{' '}
              <Link to="/campanhas/configurar" className="text-primary hover:underline underline-offset-4">origens sem anúncio</Link>.
            </p>
          </section>
        </>
      )}

      <CampaignWonDetails
        open={!!detailsFor}
        onOpenChange={(open) => { if (!open) setDetailsFor(null); }}
        campaignName={detailsFor?.name ?? ''}
        periodLabel={periodText}
        leads={(detailsFor && winsByGroup.get(detailsFor.key)) || []}
      />
    </div>
  );
};

interface GroupDetailsProps {
  group: ScoreGroup;
  lossLabels: Map<string, string>;
  showAll: boolean;
  onShowAll: () => void;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ group, lossLabels, showAll, onShowAll }) => {
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

  const luDoubts = group.leads.filter((l) => l.outcome === 'open' && l.lu?.doubt).length;
  const facts: { label: string; value: string; hint?: string }[] = [
    ...(group.kind === 'ad'
      ? [
        { label: 'Criado na Meta', value: group.createdAt ? fullDate.format(new Date(group.createdAt)) : 'Sem data', hint: group.createdAt ? ago(group.createdAt) : undefined },
        { label: 'Status na Meta', value: group.status ? AD_STATUS_LABEL[group.status] ?? group.status : 'Sem acesso' },
      ]
      : []),
    { label: 'Contatos', value: String(total) },
    { label: 'Fecharam', value: String(group.won), hint: group.won ? closeRatio(group.won, total) : undefined },
    { label: 'Em negociação', value: String(group.open) },
    { label: 'Vendido', value: formatCurrency(group.revenue) },
  ];

  return (
    <section aria-label={`Contatos de ${group.name}`} className="rounded-lg border border-border bg-background/60">
      <div className="flex flex-col gap-2 px-5 pt-4 pb-4 border-b border-border">
        {group.raw && <p className="text-xs text-muted-foreground break-all">Na Meta: {group.raw}</p>}
        {group.adIds.size > 1 && (
          <p className="self-start text-xs text-info bg-info-subtle rounded-md px-3 py-2">
            A Meta tem {group.adIds.size} anúncios com esse nome, em campanhas diferentes. Esta linha soma todos.
          </p>
        )}
        <p className="text-sm text-foreground max-w-2xl">
          {total} {total === 1 ? 'pessoa chamou' : 'pessoas chamaram'}. {group.won === 0 ? 'Nenhuma comprou' : `${group.won} ${group.won === 1 ? 'comprou' : 'compraram'}`}
          {group.open > 0 && `, ${group.open} ${group.open === 1 ? 'ainda está' : 'ainda estão'} em negociação`}.
          {luDoubts > 0 && ` A Lu ficou em dúvida em ${luDoubts}: vale abrir a conversa.`}
        </p>
        {reasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Por que não fecharam:</span>
            {reasons.map(([label, n]) => (
              <span key={label} className="text-xs text-foreground bg-muted px-2.5 py-1 rounded-full">{label} ({n})</span>
            ))}
          </div>
        )}
        {group.kind === 'ad' && group.status === 'ACTIVE' && group.verdict === 'bad' && (
          <p className="text-xs text-muted-foreground">Para parar de receber contatos por aqui, pause o anúncio no Gerenciador de Anúncios da Meta.</p>
        )}
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-6 gap-x-6 gap-y-4 px-5 py-4 border-b border-border">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5 min-w-0">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="text-base font-semibold text-foreground tabular-nums">{f.value}</dd>
            {f.hint && <dd className="text-xs text-muted-foreground">{f.hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Pessoas que chegaram por {group.name} e a situação de cada uma</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th scope="col" className="py-2.5 px-5 font-medium">Pessoa</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Chamou em</th>
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
                <td className="py-2.5 pr-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-full ${OUTCOME_CLASS[l.outcome]}`}>
                      {outcomeText(l)}
                    </span>
                    {l.outcome === 'won' && l.lu?.applied && (
                      <span title={l.lu.evidence ?? undefined} className="whitespace-nowrap text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground cursor-help">
                        Marcado pela Lu
                      </span>
                    )}
                    {l.outcome === 'open' && l.lu?.doubt && (
                      <span title={l.lu.evidence ?? undefined} className="whitespace-nowrap text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground cursor-help">
                        Lu em dúvida
                      </span>
                    )}
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

export default ScoreboardView;
