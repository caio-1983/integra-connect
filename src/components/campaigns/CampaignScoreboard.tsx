import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/api';
import { fetchCampaigns } from '@/services/attributionService';
import { PERIOD_PRESETS, resolvePeriod, type Period, type PeriodPreset } from '@/services/analyticsService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchScoreboardLeads, fetchScoreboardWins, type CampaignLead } from '@/services/campaignScoreboardService';
import { invalidateReport, loadReport } from '@/components/results/useReport';
import { ScoreboardView } from '@/components/campaigns/ScoreboardView';

/**
 * "Qual anúncio vale a pena manter?" — loads, for the chosen period, every lead
 * a Meta ad (or a named origin without an ad) brought and what happened to
 * each, and hands it to ScoreboardView. Ads need no setup: name, status and
 * creation date come from the Meta catalog.
 */

const ALL_TIME: Period = {
  from: new Date(2000, 0, 1),
  to: new Date(Date.now() + 86_400_000),
  prevFrom: new Date(2000, 0, 1),
  prevTo: new Date(2000, 0, 1),
  label: 'desde o início',
};

/** "desde o início" / "nos últimos 30 dias" / "em setembro de 2026" — period labels need their own preposition. */
function inPeriod(label: string): string {
  if (label === ALL_TIME.label) return label;
  return label.startsWith('últimos') ? `nos ${label}` : `em ${label}`;
}

/**
 * Everything the scoreboard needs for one period, fetched in parallel. The
 * campaign list only names the no-ad origins, so leads and wins don't wait on
 * it — names are applied once everything is back.
 */
async function fetchScoreboard(period: Period) {
  const noNames = new Map<string, string>();
  const [c, reasons, l, w] = await Promise.all([
    fetchCampaigns(), api.fetchLossReasons(), fetchScoreboardLeads(period, noNames), fetchScoreboardWins(period, noNames),
  ]);
  const names = new Map(c.map((x) => [x.id, x.name]));
  const named = (lead: CampaignLead): CampaignLead =>
    lead.campaignId && names.has(lead.campaignId) ? { ...lead, campaignName: names.get(lead.campaignId)! } : lead;
  return {
    lossLabels: new Map(reasons.map((r) => [r.key, r.label])),
    leads: l.map(named),
    wins: w.map(named),
  };
}

export const CampaignScoreboard: React.FC = () => {
  // Starts with no period: the question is which ad brings the most money
  // overall. Over all time the cohort count and the sales-date count are the
  // same set, so this screen and Detalhes agree.
  const [preset, setPreset] = useState<PeriodPreset | 'all'>('all');
  const period = useMemo(() => (preset === 'all' ? ALL_TIME : resolvePeriod(preset)), [preset]);

  const [lossLabels, setLossLabels] = useState<Map<string, string>>(new Map());
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [wins, setWins] = useState<CampaignLead[]>([]);
  const [status, setStatus] = useState<'loading' | 'failed' | 'ready'>('loading');

  const load = useCallback(async (force = false) => {
    if (force) invalidateReport('scoreboard');
    setStatus('loading');
    try {
      const data = await loadReport('scoreboard', fetchScoreboard, period);
      setLossLabels(data.lossLabels);
      setLeads(data.leads);
      setWins(data.wins);
      setStatus('ready');
    } catch (error) {
      console.error('[campaigns] Error loading scoreboard:', error);
      setStatus('failed');
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ScoreboardView
      key={preset}
      leads={leads}
      wins={wins}
      lossLabels={lossLabels}
      period={period}
      periodText={inPeriod(period.label)}
      allTime={preset === 'all'}
      status={status}
      onRetry={() => void load(true)}
      periodControl={(
        <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset | 'all')}>
          <SelectTrigger className="h-9 w-44" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            {PERIOD_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
};

export default CampaignScoreboard;
