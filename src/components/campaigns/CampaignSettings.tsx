import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, Link2, Plus, Trash2, AlertCircle, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer, PageHeader, SectionBlock } from '@/components/layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import {
  createCampaign,
  createCampaignMapping,
  deleteCampaignMapping,
  fetchCampaignMappings,
  fetchCampaigns,
  fetchUnmappedSignals,
  updateCampaign,
  type UnmappedSignal,
} from '@/services/attributionService';
import {
  CAMPAIGN_MATCH_TYPE_LABEL,
  type Campaign,
  type CampaignMapping,
  type CampaignMatchType,
} from '@/types';

const MATCH_TYPES = Object.keys(CAMPAIGN_MATCH_TYPE_LABEL) as CampaignMatchType[];

/**
 * Campaign registry + the mapping rules that turn raw tracking signals into a
 * campaign name.
 *
 * This page IS the "mapeamento" the team asked for. Attribution is resolved at
 * read time against these rules (see the `lead_attribution_resolved` view), so
 * every change here retroactively re-attributes the whole history — a manager can
 * fix a wrong mapping months later and the revenue report corrects itself.
 *
 * There is deliberately no budget/spend field: CPL, CAC and ROI are out of scope
 * by product decision. A campaign here is a NAME for a group of tracking signals,
 * nothing more.
 */
export const CampaignSettings: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mappings, setMappings] = useState<CampaignMapping[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [newStart, setNewStart] = useState('');
  const [creating, setCreating] = useState(false);

  const [ruleCampaign, setRuleCampaign] = useState('');
  const [ruleType, setRuleType] = useState<CampaignMatchType>('meta_ad_id');
  const [ruleValue, setRuleValue] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, m, u] = await Promise.all([fetchCampaigns(), fetchCampaignMappings(), fetchUnmappedSignals()]);
    setCampaigns(c);
    setMappings(m);
    setUnmapped(u);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const campaignById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c])),
    [campaigns],
  );

  const mappingsByCampaign = useMemo(() => {
    const grouped = new Map<string, CampaignMapping[]>();
    for (const m of mappings) {
      const list = grouped.get(m.campaignId);
      if (list) list.push(m);
      else grouped.set(m.campaignId, [m]);
    }
    return grouped;
  }, [mappings]);

  const handleCreateCampaign = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCampaign({ name: newName, channel: newChannel, startedAt: newStart || null });
      setNewName('');
      setNewChannel('');
      setNewStart('');
      toast.success('Campanha criada.');
      await load();
    } catch (error) {
      const message = (error as { code?: string }).code === '23505'
        ? 'Já existe uma campanha com esse nome.'
        : 'Não foi possível criar a campanha.';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateRule = async (campaignId: string, matchType: CampaignMatchType, value: string) => {
    if (!campaignId || !value.trim()) return;
    setSavingRule(true);
    try {
      await createCampaignMapping(campaignId, matchType, value);
      setRuleValue('');
      toast.success('Mapeamento criado. O histórico já foi reatribuído.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o mapeamento.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteCampaignMapping(id);
      toast.success('Mapeamento removido.');
      await load();
    } catch {
      toast.error('Não foi possível remover o mapeamento.');
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      await updateCampaign(campaign.id, { isActive: !campaign.isActive });
      toast.success(campaign.isActive ? 'Campanha desativada.' : 'Campanha reativada.');
      await load();
    } catch {
      toast.error('Não foi possível atualizar a campanha.');
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Campanhas e origem dos leads"
        description="Dê nome às campanhas e diga quais sinais de rastreamento pertencem a cada uma. O mapeamento vale para todo o histórico — corrigir uma regra aqui corrige os relatórios já existentes."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando campanhas…
        </div>
      ) : (
        <>
          {/* The unmapped list comes first on purpose: it is the actionable part.
              A growing "Não mapeado" bucket in the revenue report is only fixable
              from here, so it should be the first thing a manager sees. */}
          <SectionBlock
            title="Sinais ainda não mapeados"
            icon={AlertCircle}
            description="Valores de rastreamento que chegaram com leads reais mas não pertencem a nenhuma campanha. Enquanto estiverem aqui, esses leads aparecem como “Não mapeado” nos relatórios."
          >
            {unmapped.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="Nada pendente"
                description="Todo sinal de rastreamento recebido já está associado a uma campanha."
                compact
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Tipo de sinal</th>
                      <th className="py-2 pr-4 font-medium">Valor</th>
                      <th className="py-2 pr-4 font-medium">Leads</th>
                      <th className="py-2 pr-4 font-medium">Mapear para</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmapped.map((signal) => (
                      <tr key={`${signal.matchType}-${signal.value}`} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">{CAMPAIGN_MATCH_TYPE_LABEL[signal.matchType]}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-foreground break-all">{signal.value}</td>
                        <td className="py-2 pr-4 tabular-nums">{signal.leadCount}</td>
                        <td className="py-2 pr-4">
                          <Select
                            value=""
                            onValueChange={(campaignId) => void handleCreateRule(campaignId, signal.matchType, signal.value)}
                            disabled={savingRule || campaigns.length === 0}
                          >
                            <SelectTrigger className="h-8 w-56">
                              <SelectValue placeholder={campaigns.length ? 'Escolher campanha' : 'Crie uma campanha'} />
                            </SelectTrigger>
                            <SelectContent>
                              {campaigns.filter((c) => c.isActive).map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionBlock>

          <SectionBlock title="Nova campanha" icon={Plus}>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-name">Nome *</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex: Setembro — Planos"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-channel">Canal</Label>
                <Input
                  id="campaign-channel"
                  placeholder="Ex: meta_ads"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="campaign-start">Início</Label>
                <Input
                  id="campaign-start"
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateCampaign} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
              </Button>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Campanhas"
            icon={Megaphone}
            description="Cada campanha reúne um ou mais sinais de rastreamento. Um lead é atribuído pelo sinal mais específico que carregar — o ID do anúncio vence o número de WhatsApp."
          >
            {campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Nenhuma campanha cadastrada"
                description="Crie uma campanha acima para começar a agrupar a origem dos leads."
                compact
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => {
                  const rules = mappingsByCampaign.get(campaign.id) ?? [];
                  return (
                    <div
                      key={campaign.id}
                      className={`rounded-lg border border-border p-4 ${campaign.isActive ? 'bg-card' : 'bg-muted/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{campaign.name}</h3>
                            {!campaign.isActive && (
                              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                Inativa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[campaign.channel, campaign.startedAt && `desde ${campaign.startedAt}`]
                              .filter(Boolean).join(' · ') || 'Sem canal ou período informado'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(campaign)}
                          title={campaign.isActive ? 'Desativar campanha' : 'Reativar campanha'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>

                      {rules.length > 0 && (
                        <ul className="space-y-1.5 mb-3">
                          {rules.map((rule) => (
                            <li key={rule.id} className="flex items-center gap-2 text-sm">
                              <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground text-xs">{CAMPAIGN_MATCH_TYPE_LABEL[rule.matchType]}</span>
                              <span className="font-mono text-xs text-foreground break-all">{rule.matchValue}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteRule(rule.id)}
                                title="Remover mapeamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border/60">
                        <div className="space-y-1.5">
                          <Label className="text-xs" htmlFor={`rule-type-${campaign.id}`}>Sinal</Label>
                          <Select
                            value={ruleCampaign === campaign.id ? ruleType : 'meta_ad_id'}
                            onValueChange={(v) => { setRuleCampaign(campaign.id); setRuleType(v as CampaignMatchType); }}
                          >
                            <SelectTrigger id={`rule-type-${campaign.id}`} className="h-8 w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MATCH_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{CAMPAIGN_MATCH_TYPE_LABEL[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[12rem]">
                          <Label className="text-xs" htmlFor={`rule-value-${campaign.id}`}>Valor</Label>
                          <Input
                            id={`rule-value-${campaign.id}`}
                            className="h-8"
                            placeholder="Ex: 120400123456789 ou lp-planos"
                            value={ruleCampaign === campaign.id ? ruleValue : ''}
                            onChange={(e) => { setRuleCampaign(campaign.id); setRuleValue(e.target.value); }}
                          />
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingRule || ruleCampaign !== campaign.id || !ruleValue.trim()}
                          onClick={() => handleCreateRule(campaign.id, ruleType, ruleValue)}
                        >
                          Mapear
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionBlock>

          <SectionBlock title="Como rastrear cada origem" icon={Link2}>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-foreground">Anúncio da Meta → WhatsApp</dt>
                <dd className="text-muted-foreground">
                  Capturado automaticamente. A primeira mensagem de quem clica no anúncio carrega o ID
                  do anúncio; mapeie esse ID para a campanha. Nada a configurar no anúncio.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Site próprio</dt>
                <dd className="text-muted-foreground">
                  Use links no formato{' '}
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    https://wa.me/55SEUNUMERO?text=Olá!%20[ref:lp-planos]
                  </code>{' '}
                  — um token por página. O token é lido e removido antes da mensagem aparecer na
                  conversa. Mapeie o token para a campanha.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Um número por origem</dt>
                <dd className="text-muted-foreground">
                  Se uma origem usa um número de WhatsApp dedicado, mapeie o próprio número. É o sinal
                  menos específico, então perde para o ID do anúncio quando os dois existem.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Orgânico, indicação e offline</dt>
                <dd className="text-muted-foreground">
                  Não há como rastrear automaticamente. O atendente marca a origem na própria conversa,
                  e esses leads ficam identificados como informados manualmente.
                </dd>
              </div>
            </dl>
          </SectionBlock>
        </>
      )}
    </PageContainer>
  );
};

export default CampaignSettings;
