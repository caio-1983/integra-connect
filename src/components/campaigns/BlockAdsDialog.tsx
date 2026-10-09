import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createCampaignMapping,
  fetchBlockAds,
  splitBlockIntoAds,
  type BlockAd,
} from '@/services/attributionService';
import type { Campaign } from '@/types';

// Radix Select rejects an empty value, so "no campaign" needs its own token.
const NONE = '__none';

interface BlockAdsDialogProps {
  /** Meta campaign name — the block. Null keeps the dialog closed. */
  blockName: string | null;
  /** Campaign the block is being mapped to, or already mapped to. */
  campaignId: string;
  /** Set when the block already has a rule ("abrir o bloco"); null when mapping it fresh. */
  blockRuleId: string | null;
  campaigns: Campaign[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * Shows what a Meta campaign block contains before a whole-block rule is
 * created, and lets the manager split it into per-ad rules instead. Born from
 * a fita ad landing in "Mangueira Chata" because its block was mapped blind.
 */
export const BlockAdsDialog: React.FC<BlockAdsDialogProps> = ({
  blockName, campaignId, blockRuleId, campaigns, onClose, onDone,
}) => {
  const [ads, setAds] = useState<BlockAd[] | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!blockName) return;
    setAds(null);
    void fetchBlockAds(blockName).then((list) => {
      setAds(list);
      setChoice(Object.fromEntries(list.map((ad) => [ad.adId, campaignId])));
    });
  }, [blockName, campaignId]);

  const campaignName = campaigns.find((c) => c.id === campaignId)?.name ?? 'esta campanha';
  const activeCampaigns = campaigns.filter((c) => c.isActive || c.id === campaignId);

  const run = async (action: () => Promise<void>, message: string) => {
    setSaving(true);
    try {
      await action();
      toast.success(message);
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o mapeamento.');
    } finally {
      setSaving(false);
    }
  };

  const mapWholeBlock = () => run(
    () => createCampaignMapping(campaignId, 'meta_campaign_name', blockName!),
    'Bloco mapeado. O histórico já foi reatribuído.',
  );

  const splitByAd = () => run(
    () => splitBlockIntoAds(
      (ads ?? []).map((ad) => ({ adId: ad.adId, campaignId: choice[ad.adId] === NONE ? null : choice[ad.adId] })),
      blockRuleId,
    ),
    'Anúncios mapeados um a um. O histórico já foi reatribuído.',
  );

  return (
    <Dialog open={!!blockName} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{blockRuleId ? 'Abrir o bloco em anúncios' : 'Mapear o bloco inteiro?'}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs break-all">{blockName}</span>
            <br />
            {blockRuleId
              ? 'Cada anúncio vira uma regra própria. Ajuste os que não pertencem a esta campanha.'
              : `Mapear o bloco coloca todos os anúncios abaixo, e os que entrarem nele depois, em ${campaignName}. Se algum for de outro produto, mapeie por anúncio.`}
          </DialogDescription>
        </DialogHeader>

        {ads === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando anúncios…
          </div>
        ) : ads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum anúncio identificado neste bloco. Só dá para mapear o bloco inteiro.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Anúncio</th>
                  <th className="py-2 pr-3 font-medium">Leads</th>
                  <th className="py-2 font-medium">Campanha</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.adId} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="block text-foreground break-all">{ad.adName ?? 'Sem nome no catálogo'}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{ad.adId}</span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{ad.leadCount}</td>
                    <td className="py-2">
                      <Select
                        value={choice[ad.adId] ?? campaignId}
                        onValueChange={(v) => setChoice((prev) => ({ ...prev, [ad.adId]: v }))}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCampaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                          <SelectItem value={NONE}>Sem campanha</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          {!blockRuleId && (
            <Button variant="secondary" onClick={mapWholeBlock} disabled={saving || ads === null}>
              Mapear o bloco inteiro
            </Button>
          )}
          <Button onClick={splitByAd} disabled={saving || !ads?.length}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar por anúncio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
