import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Trash2, AlertCircle, Loader2, Power, Pencil, Signpost, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer, PageHeader, SectionBlock } from '@/components/layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

/**
 * Origens sem anúncio: names for the ways people reach WhatsApp WITHOUT
 * clicking a Meta ad — a pre-filled phrase (profile button, bio link, site, QR
 * code), a [ref:] token, a UTM, a dedicated number.
 *
 * Meta ads need nothing here: the scoreboard lists each ad by itself, with the
 * name, status and creation date the Meta catalog returns. An origin is stored
 * as a campaign row plus its rules; campaigns that only ever held ad rules
 * (the old per-ad mapping) are kept in the database and left off this page.
 *
 * Rules resolve at read time (`lead_attribution_resolved`), so naming a phrase
 * today also names the leads that already sent it.
 */

const AD_RULE_TYPES: CampaignMatchType[] = ['meta_ad_id', 'meta_campaign_name'];
const ORIGIN_RULE_TYPES = (Object.keys(CAMPAIGN_MATCH_TYPE_LABEL) as CampaignMatchType[])
  .filter((t) => !AD_RULE_TYPES.includes(t));

export const CampaignSettings: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mappings, setMappings] = useState<CampaignMapping[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [ruleCampaign, setRuleCampaign] = useState('');
  const [ruleType, setRuleType] = useState<CampaignMatchType>('first_message');
  const [ruleValue, setRuleValue] = useState('');
  const [savingRule, setSavingRule] = useState(false);

  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, m, u] = await Promise.all([fetchCampaigns(), fetchCampaignMappings(), fetchUnmappedSignals()]);
    setCampaigns(c);
    setMappings(m);
    setUnmapped(u.filter((s) => !AD_RULE_TYPES.includes(s.matchType)));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const rulesByCampaign = useMemo(() => {
    const grouped = new Map<string, CampaignMapping[]>();
    for (const m of mappings) {
      const list = grouped.get(m.campaignId);
      if (list) list.push(m);
      else grouped.set(m.campaignId, [m]);
    }
    return grouped;
  }, [mappings]);

  // An origin is a campaign with at least one no-ad rule, or a fresh one with
  // no rule yet. Campaigns holding only ad rules belong to the old mapping.
  const origins = useMemo(() => campaigns.filter((c) => {
    const rules = rulesByCampaign.get(c.id) ?? [];
    if (rules.length === 0) return c.isActive;
    return rules.some((r) => !AD_RULE_TYPES.includes(r.matchType));
  }), [campaigns, rulesByCampaign]);

  const activeOrigins = origins.filter((c) => c.isActive);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCampaign({ name: newName });
      setNewName('');
      toast.success('Origem criada.');
      await load();
    } catch (error) {
      const message = (error as { code?: string }).code === '23505'
        ? 'Já existe uma origem ou campanha com esse nome.'
        : 'Não foi possível criar a origem.';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renaming || !renaming.name.trim()) return;
    try {
      await updateCampaign(renaming.id, { name: renaming.name });
      toast.success('Nome salvo.');
      setRenaming(null);
      await load();
    } catch (error) {
      toast.error((error as { code?: string }).code === '23505'
        ? 'Já existe uma origem ou campanha com esse nome.'
        : 'Não foi possível salvar o nome.');
    }
  };

  const handleCreateRule = async (campaignId: string, matchType: CampaignMatchType, value: string) => {
    if (!campaignId || !value.trim()) return;
    setSavingRule(true);
    try {
      await createCampaignMapping(campaignId, matchType, value);
      setRuleValue('');
      toast.success('Ligado à origem. Quem já chegou assim também passa a contar.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível ligar à origem.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteCampaignMapping(id);
      toast.success('Removido da origem.');
      await load();
    } catch {
      toast.error('Não foi possível remover.');
    }
  };

  const handleToggleActive = async (origin: Campaign) => {
    try {
      await updateCampaign(origin.id, { isActive: !origin.isActive });
      toast.success(origin.isActive ? 'Origem desativada.' : 'Origem reativada.');
      await load();
    } catch {
      toast.error('Não foi possível atualizar a origem.');
    }
  };

  // Inside the Campanhas tabs the shell already provides page chrome.
  const Shell = embedded ? React.Fragment : PageContainer;

  return (
    <Shell>
      {!embedded && (
        <PageHeader
          title="Origens sem anúncio"
          description="Dê nome a quem chega sem clicar num anúncio: botão do perfil, link na bio, site, QR code. Os anúncios da Meta aparecem no placar sozinhos."
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando origens…
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Anúncios da Meta não precisam de nada aqui: cada anúncio aparece no placar com o nome, o status e a data de criação
            que vêm da Meta. Esta página é só para quem chega sem anúncio.
          </p>

          {/* Pending first: it is the actionable part. Until a repeated phrase
              or link gets a name, those leads stay off the scoreboard. */}
          <SectionBlock
            title="Frases e links ainda sem nome"
            icon={AlertCircle}
            description="Frases pré-preenchidas e links rastreados que já trouxeram gente, mas ainda não pertencem a nenhuma origem. Enquanto estiverem aqui, esses contatos ficam fora do placar."
          >
            {unmapped.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="Nada pendente"
                description="Toda frase ou link repetido já tem uma origem."
                compact
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4 font-medium">Tipo</th>
                      <th className="py-2 pr-4 font-medium">Valor</th>
                      <th className="py-2 pr-4 font-medium">Contatos</th>
                      <th className="py-2 pr-4 font-medium">Ligar à origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmapped.map((signal) => (
                      <tr key={`${signal.matchType}-${signal.value}`} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{CAMPAIGN_MATCH_TYPE_LABEL[signal.matchType]}</td>
                        <td className="py-2 pr-4 text-foreground break-words max-w-md">{signal.value}</td>
                        <td className="py-2 pr-4 tabular-nums">{signal.leadCount}</td>
                        <td className="py-2 pr-4">
                          <Select
                            value=""
                            onValueChange={(campaignId) => void handleCreateRule(campaignId, signal.matchType, signal.value)}
                            disabled={savingRule || activeOrigins.length === 0}
                          >
                            <SelectTrigger className="h-8 w-56" aria-label={`Ligar ${signal.value} a uma origem`}>
                              <SelectValue placeholder={activeOrigins.length ? 'Escolher origem' : 'Crie uma origem abaixo'} />
                            </SelectTrigger>
                            <SelectContent>
                              {activeOrigins.map((c) => (
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

          <SectionBlock title="Nova origem" icon={Plus}>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-[14rem] max-w-md">
                <Label htmlFor="origin-name">Nome</Label>
                <Input
                  id="origin-name"
                  placeholder="Ex: Botão do Instagram"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                />
              </div>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar origem'}
              </Button>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Origens"
            icon={Signpost}
            description="Cada origem junta uma ou mais frases ou links. No placar, ela aparece como uma linha tracejada, depois dos anúncios."
          >
            {origins.length === 0 ? (
              <EmptyState
                icon={Signpost}
                title="Nenhuma origem ainda"
                description="Crie uma origem acima e ligue a ela a frase pré-preenchida do botão ou do link."
                compact
              />
            ) : (
              <div className="space-y-3">
                {origins.map((origin) => {
                  const rules = (rulesByCampaign.get(origin.id) ?? []).filter((r) => !AD_RULE_TYPES.includes(r.matchType));
                  const isRenaming = renaming?.id === origin.id;
                  return (
                    <div
                      key={origin.id}
                      className={`rounded-lg border border-border p-4 ${origin.isActive ? 'bg-card' : 'bg-muted/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {isRenaming ? (
                          <div className="flex items-center gap-2 flex-1 max-w-md">
                            <Input
                              autoFocus
                              aria-label="Nome da origem"
                              className="h-8"
                              value={renaming.name}
                              onChange={(e) => setRenaming({ id: origin.id, name: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleRename();
                                if (e.key === 'Escape') setRenaming(null);
                              }}
                            />
                            <Button variant="ghost" size="sm" onClick={handleRename} aria-label="Salvar nome">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setRenaming(null)} aria-label="Cancelar">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{origin.name}</h3>
                            {!origin.isActive && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inativa</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-muted-foreground"
                              onClick={() => setRenaming({ id: origin.id, name: origin.name })}
                              aria-label={`Renomear ${origin.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(origin)}
                          aria-label={origin.isActive ? `Desativar ${origin.name}` : `Reativar ${origin.name}`}
                          title={origin.isActive ? 'Desativar origem' : 'Reativar origem'}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>

                      {rules.length > 0 && (
                        <ul className="space-y-1.5 mb-3">
                          {rules.map((rule) => (
                            <li key={rule.id} className="flex items-center gap-2 text-sm">
                              <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                              <span className="text-muted-foreground text-xs whitespace-nowrap">{CAMPAIGN_MATCH_TYPE_LABEL[rule.matchType]}</span>
                              <span className="text-xs text-foreground break-words min-w-0">{rule.matchValue}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteRule(rule.id)}
                                aria-label={`Remover ${rule.matchValue} da origem`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border/60">
                        <div className="space-y-1.5">
                          <Label className="text-xs" htmlFor={`rule-type-${origin.id}`}>Tipo</Label>
                          <Select
                            value={ruleCampaign === origin.id ? ruleType : 'first_message'}
                            onValueChange={(v) => { setRuleCampaign(origin.id); setRuleType(v as CampaignMatchType); setRuleValue(''); }}
                          >
                            <SelectTrigger id={`rule-type-${origin.id}`} className="h-8 w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORIGIN_RULE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{CAMPAIGN_MATCH_TYPE_LABEL[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[12rem]">
                          <Label className="text-xs" htmlFor={`rule-value-${origin.id}`}>Valor</Label>
                          {(ruleCampaign === origin.id ? ruleType : 'first_message') === 'first_message' ? (
                            <Textarea
                              id={`rule-value-${origin.id}`}
                              rows={2}
                              className="text-sm"
                              placeholder="A frase exata que o link preenche, ex: Olá! Vim pelo Instagram e quero um orçamento."
                              value={ruleCampaign === origin.id ? ruleValue : ''}
                              onChange={(e) => { setRuleCampaign(origin.id); setRuleValue(e.target.value); }}
                            />
                          ) : (
                            <Input
                              id={`rule-value-${origin.id}`}
                              className="h-8"
                              placeholder="Ex: lp-planos"
                              value={ruleCampaign === origin.id ? ruleValue : ''}
                              onChange={(e) => { setRuleCampaign(origin.id); setRuleValue(e.target.value); }}
                            />
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={savingRule || ruleCampaign !== origin.id || !ruleValue.trim()}
                          onClick={() => handleCreateRule(origin.id, ruleCampaign === origin.id ? ruleType : 'first_message', ruleValue)}
                        >
                          Ligar
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
                  Automático. Quem clica no anúncio chega com o ID dele, e o placar mostra o anúncio com o nome, o status e a data
                  de criação da Meta. Nada a configurar aqui nem no anúncio.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Frase pré-preenchida</dt>
                <dd className="text-muted-foreground">
                  Para o que chega sem anúncio — botão do WhatsApp no perfil do Instagram ou na página do Facebook, link na bio,
                  site, QR code, panfleto —, use uma mensagem pré-preenchida diferente por origem (ex.:{' '}
                  <span className="italic">Olá! Vim pelo Instagram e quero um orçamento.</span>) e ligue a frase exata a uma origem.
                  Maiúsculas e espaços extras não importam; qualquer outra mudança no texto, sim. Frases repetidas que ainda não
                  têm origem aparecem em “Frases e links ainda sem nome”.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Site próprio</dt>
                <dd className="text-muted-foreground">
                  Use links no formato{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    https://wa.me/55SEUNUMERO?text=Olá!%20[ref:lp-planos]
                  </code>{' '}
                  — um token por página. O token é lido e removido antes da mensagem aparecer na conversa. Ligue o token a uma origem.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Um número por origem</dt>
                <dd className="text-muted-foreground">
                  Se uma origem usa um número de WhatsApp dedicado, ligue o próprio número. Quando a pessoa também clicou num
                  anúncio, o anúncio vence.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Orgânico, indicação e offline</dt>
                <dd className="text-muted-foreground">
                  Não há como rastrear automaticamente. O atendente marca a origem na própria conversa, e esses contatos ficam
                  identificados como informados manualmente.
                </dd>
              </div>
            </dl>
          </SectionBlock>
        </>
      )}
    </Shell>
  );
};

export default CampaignSettings;
