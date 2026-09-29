import React, { useEffect, useState } from 'react';
import { Globe, Hand, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { fetchLeadAttribution, setManualAttribution } from '@/services/attributionService';
import { LEAD_SOURCE_KIND_LABEL, type LeadAttribution, type LeadSourceKind } from '@/types';

interface LeadOriginCardProps {
  contactId: string;
  /** Channel of the conversation, used as the default when marking origin by hand. */
  channel: string;
}

/**
 * Where this lead came from, shown and correctable inside the conversation.
 *
 * Two jobs. Read: an attendant seeing "veio do anúncio de setembro" has context
 * the AI cannot give them. Write: organic, referral and offline leads are
 * *impossible* to track automatically, so someone has to say so — and tracked
 * origins are sometimes wrong and need fixing.
 *
 * Fetches by `contactId` rather than taking attribution as a prop: CustomerCard is
 * presentational and threaded from ChatInterface, and origin is only ever needed
 * when this panel is open.
 */

/** Kinds an operator can pick. `paid_ad` and `website` are excluded on purpose:
 *  those are only trustworthy when measured, and letting someone assert "came
 *  from an ad" by hand would corrupt the paid-media numbers. */
const MANUAL_KINDS: LeadSourceKind[] = ['organic', 'referral', 'offline', 'direct_social', 'unknown'];

export const LeadOriginCard: React.FC<LeadOriginCardProps> = ({ contactId, channel }) => {
  const [attribution, setAttribution] = useState<LeadAttribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<LeadSourceKind>('organic');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEditing(false);
    fetchLeadAttribution(contactId)
      .then((data) => {
        if (cancelled) return;
        setAttribution(data);
        if (data) setKind(data.sourceKind);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contactId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setManualAttribution(contactId, {
        sourceChannel: channel || 'manual',
        sourceKind: kind,
        note: note || undefined,
      });
      const refreshed = await fetchLeadAttribution(contactId);
      setAttribution(refreshed);
      setEditing(false);
      setNote('');
      toast.success('Origem registrada.');
    } catch {
      toast.error('Não foi possível registrar a origem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Origem
        </p>
        {!loading && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-primary hover:text-primary/80 transition-colors"
            title={attribution ? 'Corrigir origem' : 'Informar origem'}
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      ) : editing ? (
        <div className="space-y-2">
          <Select value={kind} onValueChange={(v) => setKind(v as LeadSourceKind)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MANUAL_KINDS.map((k) => (
                <SelectItem key={k} value={k}>{LEAD_SOURCE_KIND_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-8 text-xs"
            placeholder="Detalhe (ex: indicação do Carlos)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Salvar
            </button>
            <button
              onClick={() => { setEditing(false); setNote(''); }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
          </div>
          {/* Said out loud because overwriting a tracked origin is a real
              consequence, not a neutral edit. */}
          {attribution && !attribution.setManually && (
            <p className="text-[10px] text-amber-700">
              Isso substitui a origem detectada automaticamente.
            </p>
          )}
        </div>
      ) : attribution ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-foreground font-medium">
              {LEAD_SOURCE_KIND_LABEL[attribution.sourceKind]}
            </span>
            {attribution.setManually && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-muted-foreground"
                title="Informado por um atendente"
              >
                <Hand className="w-2 h-2" /> manual
              </span>
            )}
          </div>
          {attribution.campaignName && (
            <p className="text-[11px] text-muted-foreground">
              Campanha: <span className="text-foreground">{attribution.campaignName}</span>
            </p>
          )}
          {/* An ad-sourced lead with no campaign yet is actionable information for
              a manager, so it says so instead of silently showing nothing. */}
          {!attribution.campaignName && attribution.rawCampaignSignal && (
            <p className="text-[11px] text-muted-foreground">
              Sinal não mapeado:{' '}
              <span className="font-mono text-[10px] text-foreground break-all">{attribution.rawCampaignSignal}</span>
            </p>
          )}
          {attribution.sourceRaw.ad_title && (
            <p className="text-[11px] text-muted-foreground truncate" title={attribution.sourceRaw.ad_title}>
              Anúncio{attribution.sourceRaw.ad_source_app === 'instagram' ? ' (Instagram)' : attribution.sourceRaw.ad_source_app === 'facebook' ? ' (Facebook)' : ''}:{' '}
              {attribution.sourceRaw.ad_url ? (
                <a href={attribution.sourceRaw.ad_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {attribution.sourceRaw.ad_title}
                </a>
              ) : attribution.sourceRaw.ad_title}
            </p>
          )}
          {attribution.sourceRaw.note && (
            <p className="text-[11px] text-muted-foreground">{attribution.sourceRaw.note}</p>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          Não identificada — informe se souber
        </p>
      )}
    </div>
  );
};

export default LeadOriginCard;
