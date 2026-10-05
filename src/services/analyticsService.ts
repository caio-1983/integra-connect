import { supabase } from '@/integrations/supabase/client';
import { LEAD_SOURCE_KIND_LABEL, type LeadSourceKind } from '@/types';

/**
 * Reporting layer for the "Resultados" surface.
 *
 * Every aggregate is computed by a SQL function (migration 20260810100500), never
 * by summing rows in the browser — supabase-js caps a select at 1000 rows, so a
 * client-side sum would silently under-report revenue as soon as the pipeline
 * grew. Only period arithmetic and period-over-period deltas happen here.
 */

// ============= Periods =============

export interface Period {
  from: Date;
  to: Date;
  /** Immediately preceding window of the same length, for comparison. */
  prevFrom: Date;
  prevTo: Date;
  label: string;
}

export type PeriodPreset = 'month' | 'prev_month' | '30d' | '90d' | 'year';

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Resolves a preset into a half-open range plus the preceding window.
 *
 * Calendar months compare against the previous calendar month (not "30 days
 * ago"), because "revenue dropped in the third month" is a calendar statement —
 * comparing a 31-day month against a 30-day window would invent a variation that
 * isn't there.
 */
export function resolvePeriod(preset: PeriodPreset, now: Date = new Date()): Period {
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  switch (preset) {
    case 'month': {
      const from = startOfMonth(now);
      const to = addMonths(from, 1);
      return { from, to, prevFrom: addMonths(from, -1), prevTo: from, label: `${MONTH_NAMES[from.getMonth()]} de ${from.getFullYear()}` };
    }
    case 'prev_month': {
      const to = startOfMonth(now);
      const from = addMonths(to, -1);
      return { from, to, prevFrom: addMonths(from, -1), prevTo: from, label: `${MONTH_NAMES[from.getMonth()]} de ${from.getFullYear()}` };
    }
    case '90d': {
      const to = addDays(startOfDay(now), 1);
      const from = addDays(to, -90);
      return { from, to, prevFrom: addDays(from, -90), prevTo: from, label: 'últimos 90 dias' };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear() + 1, 0, 1);
      return { from, to, prevFrom: new Date(now.getFullYear() - 1, 0, 1), prevTo: from, label: String(now.getFullYear()) };
    }
    case '30d':
    default: {
      const to = addDays(startOfDay(now), 1);
      const from = addDays(to, -30);
      return { from, to, prevFrom: addDays(from, -30), prevTo: from, label: 'últimos 30 dias' };
    }
  }
}

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'month', label: 'Este mês' },
  { value: 'prev_month', label: 'Mês anterior' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'year', label: 'Este ano' },
];

const iso = (d: Date) => d.toISOString();

/** Percentage change, or null when the baseline is zero — "+∞%" is not a fact. */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentDelta(current: number, previous: number): string | undefined {
  const pct = percentDelta(current, previous);
  if (pct === null) return undefined;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
}

// ============= Headline KPIs =============

export interface RevenueKpis {
  revenue: number;
  wonCount: number;
  lostCount: number;
  newLeads: number;
  /** Won / new leads in the window. Approximate by nature — a lead can close in a
   *  later period than it arrived — but it is the ratio the team asks about. */
  conversionRate: number;
  avgTicket: number;
}

interface RawKpis { revenue: number; won_count: number; lost_count: number; new_leads: number }

function toKpis(row: RawKpis | undefined): RevenueKpis {
  const revenue = Number(row?.revenue ?? 0);
  const wonCount = Number(row?.won_count ?? 0);
  const newLeads = Number(row?.new_leads ?? 0);
  return {
    revenue,
    wonCount,
    lostCount: Number(row?.lost_count ?? 0),
    newLeads,
    conversionRate: newLeads > 0 ? (wonCount / newLeads) * 100 : 0,
    avgTicket: wonCount > 0 ? revenue / wonCount : 0,
  };
}

export interface KpiComparison { current: RevenueKpis; previous: RevenueKpis }

export async function fetchRevenueKpis(period: Period): Promise<KpiComparison> {
  const [now, before] = await Promise.all([
    supabase.rpc('report_revenue_kpis', { p_from: iso(period.from), p_to: iso(period.to) }),
    supabase.rpc('report_revenue_kpis', { p_from: iso(period.prevFrom), p_to: iso(period.prevTo) }),
  ]);

  // A failed report must read as "unknown", never as R$ 0 — the tabs show an error state.
  if (now.error || before.error) {
    console.error('[analytics] report_revenue_kpis failed:', now.error ?? before.error);
    throw now.error ?? before.error;
  }
  return {
    current: toKpis((now.data as RawKpis[] | null)?.[0]),
    previous: toKpis((before.data as RawKpis[] | null)?.[0]),
  };
}

// ============= Revenue by campaign =============

export interface CampaignPerformanceRow {
  campaignId: string | null;
  campaignName: string;
  leads: number;
  won: number;
  revenue: number;
  leadsPrev: number;
  revenuePrev: number;
  /** Absolute revenue change vs. the previous window — the number the table sorts by. */
  revenueDelta: number;
}

interface RawCampaignRow { campaign_id: string | null; campaign_name: string; leads: number; won: number; revenue: number }

/** Unmapped rows all collapse to a single `campaign_id: null`, so the key must
 *  fall back to the name to keep them together across the two windows. */
const campaignKey = (row: RawCampaignRow) => row.campaign_id ?? `name:${row.campaign_name}`;

/**
 * Campaign performance with period-over-period revenue variation, biggest DROP
 * first.
 *
 * The sort is the feature: the team's question is "where did revenue fall?", so
 * the campaign that lost the most money has to be the first row, not something
 * they have to hunt for.
 */
export async function fetchCampaignPerformance(period: Period): Promise<CampaignPerformanceRow[]> {
  const [now, before] = await Promise.all([
    supabase.rpc('report_campaign_performance', { p_from: iso(period.from), p_to: iso(period.to) }),
    supabase.rpc('report_campaign_performance', { p_from: iso(period.prevFrom), p_to: iso(period.prevTo) }),
  ]);

  if (now.error || before.error) {
    console.error('[analytics] report_campaign_performance failed:', now.error ?? before.error);
    throw now.error ?? before.error;
  }

  const currentRows = (now.data ?? []) as RawCampaignRow[];
  const previousRows = (before.data ?? []) as RawCampaignRow[];
  const prevByKey = new Map(previousRows.map((r) => [campaignKey(r), r]));

  const merged = new Map<string, CampaignPerformanceRow>();

  for (const row of currentRows) {
    const key = campaignKey(row);
    const prev = prevByKey.get(key);
    merged.set(key, {
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      leads: Number(row.leads),
      won: Number(row.won),
      revenue: Number(row.revenue),
      leadsPrev: Number(prev?.leads ?? 0),
      revenuePrev: Number(prev?.revenue ?? 0),
      revenueDelta: Number(row.revenue) - Number(prev?.revenue ?? 0),
    });
  }

  // A campaign that produced revenue last period and NOTHING this period is the
  // most important row on the page — it would be invisible if only the current
  // window were listed.
  for (const row of previousRows) {
    const key = campaignKey(row);
    if (merged.has(key)) continue;
    merged.set(key, {
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      leads: 0,
      won: 0,
      revenue: 0,
      leadsPrev: Number(row.leads),
      revenuePrev: Number(row.revenue),
      revenueDelta: -Number(row.revenue),
    });
  }

  return [...merged.values()].sort((a, b) => a.revenueDelta - b.revenueDelta);
}

// ============= Lead origin =============

export interface OriginRow {
  kind: LeadSourceKind;
  kindLabel: string;
  channel: string;
  setManually: boolean;
  leads: number;
  won: number;
  revenue: number;
  conversionRate: number;
}

interface RawOriginRow {
  source_kind: string;
  source_channel: string;
  set_manually: boolean;
  leads: number;
  won: number;
  revenue: number;
}

export async function fetchOriginPerformance(period: Period): Promise<OriginRow[]> {
  const { data, error } = await supabase.rpc('report_origin_performance', {
    p_from: iso(period.from),
    p_to: iso(period.to),
  });

  if (error) {
    console.error('[analytics] report_origin_performance failed:', error);
    throw error;
  }

  return ((data ?? []) as RawOriginRow[])
    .map((row) => {
      const kind = row.source_kind as LeadSourceKind;
      const leads = Number(row.leads);
      const won = Number(row.won);
      return {
        kind,
        kindLabel: LEAD_SOURCE_KIND_LABEL[kind] ?? row.source_kind,
        channel: row.source_channel,
        setManually: row.set_manually,
        leads,
        won,
        revenue: Number(row.revenue),
        conversionRate: leads > 0 ? (won / leads) * 100 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

// ============= Losses & funnel =============

export interface LossRow {
  code: string;
  label: string;
  count: number;
  valueLost: number;
}

export async function fetchLossReport(period: Period): Promise<LossRow[]> {
  const { data, error } = await supabase.rpc('report_loss_reasons', {
    p_from: iso(period.from),
    p_to: iso(period.to),
  });

  if (error) {
    console.error('[analytics] report_loss_reasons failed:', error);
    throw error;
  }

  return ((data ?? []) as { reason_code: string; reason_label: string; lost_count: number; value_lost: number }[])
    .map((row) => ({
      code: row.reason_code,
      label: row.reason_label,
      count: Number(row.lost_count),
      valueLost: Number(row.value_lost),
    }));
}

export interface FunnelRow {
  stageId: string;
  title: string;
  position: number;
  entered: number;
  /** Share of the widest stage, for the bar width. */
  share: number;
}

export async function fetchFunnel(period: Period): Promise<FunnelRow[]> {
  const { data, error } = await supabase.rpc('report_funnel', {
    p_from: iso(period.from),
    p_to: iso(period.to),
  });

  if (error) {
    console.error('[analytics] report_funnel failed:', error);
    throw error;
  }

  const rows = ((data ?? []) as { stage_id: string; stage_title: string; stage_position: number; entered: number }[])
    .map((row) => ({
      stageId: row.stage_id,
      title: row.stage_title,
      position: row.stage_position,
      entered: Number(row.entered),
      share: 0,
    }));

  const widest = Math.max(...rows.map((r) => r.entered), 0);
  return rows.map((r) => ({ ...r, share: widest > 0 ? (r.entered / widest) * 100 : 0 }));
}

// ============= Attendants =============

export interface AttendantRow {
  userId: string;
  name: string;
  messagesSent: number;
  conversationsHandled: number;
  avgFirstResponseSeconds: number | null;
  awaitingCount: number;
}

export async function fetchAttendantPerformance(period: Period): Promise<AttendantRow[]> {
  const { data, error } = await supabase.rpc('report_attendant_performance', {
    p_from: iso(period.from),
    p_to: iso(period.to),
  });

  if (error) {
    console.error('[analytics] report_attendant_performance failed:', error);
    throw error;
  }

  return ((data ?? []) as {
    user_id: string;
    attendant_name: string;
    messages_sent: number;
    conversations_handled: number;
    avg_first_response_seconds: number | null;
    awaiting_count: number;
  }[]).map((row) => ({
    userId: row.user_id,
    name: row.attendant_name,
    messagesSent: Number(row.messages_sent),
    conversationsHandled: Number(row.conversations_handled),
    avgFirstResponseSeconds: row.avg_first_response_seconds === null ? null : Number(row.avg_first_response_seconds),
    awaitingCount: Number(row.awaiting_count),
  }));
}

// ============= Daily contacts =============

export interface DailyContactsPoint {
  /** `dd/mm`, for the chart axis. */
  name: string;
  contacts: number;
}

const BRT_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Distinct people who messaged in, per Brasília day; days without anyone read as 0. */
export async function fetchDailyContacts(period: Pick<Period, 'from' | 'to'>): Promise<DailyContactsPoint[]> {
  const { data, error } = await supabase.rpc('report_daily_contacts', {
    p_from: iso(period.from),
    p_to: iso(period.to),
  });

  if (error) {
    console.error('[analytics] report_daily_contacts failed:', error);
    throw error;
  }

  const byDay = new Map(
    ((data ?? []) as { day: string; contacts: number }[]).map((row) => [row.day, Number(row.contacts)]),
  );

  const points: DailyContactsPoint[] = [];
  const last = BRT_DAY.format(new Date(period.to.getTime() - 1));
  const cursor = new Date(period.from);
  for (let key = BRT_DAY.format(cursor); key <= last; key = BRT_DAY.format(cursor)) {
    const [, mm, dd] = key.split('-');
    points.push({ name: `${dd}/${mm}`, contacts: byDay.get(key) ?? 0 });
    cursor.setTime(cursor.getTime() + 86_400_000);
  }
  return points;
}

/** `1h 12min` / `4min` / `38s` — response times span three orders of magnitude,
 *  so a single unit would read as either noise or nonsense. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}
