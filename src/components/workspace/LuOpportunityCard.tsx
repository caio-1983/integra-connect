import React from 'react';
import { Sparkles, Check, FileText, Loader2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { ConversationInsight } from '@/ai/types';

interface LuOpportunityCardProps {
  contactId: string;
  insight: ConversationInsight | null;
  loading: boolean;
}

const LABELS: Record<string, string> = {
  ambiente: 'Ambiente',
  uso: 'Uso',
  instalacao: 'Instalação',
  medidas: 'Medidas',
  tomDeLuz: 'Tom de luz',
  orcamento: 'Orçamento',
  produto: 'Produto',
  quantidade: 'Quantidade',
  cep: 'CEP',
  pagamento: 'Pagamento',
};

type Details = Record<string, string>;

/** Latest deal of the contact — leads are created on the first inbound, so one normally exists. */
async function fetchLatestDeal(contactId: string): Promise<{ id: string; details: Details } | null> {
  const { data } = await supabase
    .from('deals')
    .select('id, details')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const details = data.details && typeof data.details === 'object' && !Array.isArray(data.details) ? data.details as Details : {};
  return { id: data.id, details };
}

/**
 * The opportunity as Lu read it: what the customer needs and the order facts,
 * each marked ✦Lu until the attendant confirms it into `deals.details`. Also the
 * info still missing and the next steps, so the attendant knows what to ask.
 */
const LuOpportunityCard: React.FC<LuOpportunityCardProps> = ({ contactId, insight, loading }) => {
  const [deal, setDeal] = React.useState<{ id: string; details: Details } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    setDeal(null);
    fetchLatestDeal(contactId).then((d) => { if (!cancelled) setDeal(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [contactId]);

  React.useEffect(() => setDone(new Set()), [insight?.basedOnMessageId]);

  const confirmed = deal?.details ?? {};
  const detected: Details = { ...(insight?.need ?? {}), ...(insight?.fields ?? {}) };
  const rows = Object.keys(LABELS)
    .filter((key) => detected[key] || confirmed[key])
    .map((key) => ({
      key,
      value: confirmed[key] ?? detected[key],
      pending: !!detected[key] && detected[key] !== confirmed[key],
    }));
  const pendingCount = rows.filter((r) => r.pending).length;

  const confirmAll = async () => {
    if (!deal) return;
    setSaving(true);
    const details = { ...deal.details, ...detected };
    const { error } = await supabase.from('deals').update({ details }).eq('id', deal.id);
    setSaving(false);
    if (error) {
      toast.error('Não foi possível salvar na oportunidade.');
      return;
    }
    setDeal({ ...deal, details });
    toast.success('Dados confirmados na oportunidade.');
  };

  if (!insight && !loading && rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <span className="text-sm font-bold text-foreground flex-1">Oportunidade</span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="px-3 py-1.5">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">A Lu ainda não identificou o que o cliente precisa.</p>
          ) : rows.map((row) => (
            <div key={row.key} className="flex items-center gap-2 min-h-8 py-1 text-[13px]">
              <span className="w-24 flex-shrink-0 text-muted-foreground">{LABELS[row.key]}</span>
              <span className="flex-1 font-semibold text-foreground break-words">{row.value}</span>
              {row.pending
                ? <span title="Preenchido pela Lu — ainda não confirmado" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent"><Sparkles className="w-3 h-3" />Lu</span>
                : <Check aria-label="Confirmado" className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
          ))}
        </div>

        <div className="px-3 pb-3 flex flex-col gap-2">
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingCount} {pendingCount === 1 ? 'campo preenchido' : 'campos preenchidos'} pela Lu ·{' '}
              <button
                type="button"
                onClick={confirmAll}
                disabled={saving || !deal}
                title={deal ? undefined : 'Este contato ainda não tem oportunidade'}
                className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {saving ? 'salvando…' : 'confirmar todos'}
              </button>
            </p>
          )}
          <button
            type="button"
            disabled
            title="Em breve: orçamento com produtos, preços e estoque do Omie"
            className="h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Gerar orçamento
          </button>
        </div>
      </div>

      {insight && (insight.missing.length > 0 || insight.nextSteps.length > 0) && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-foreground flex-1">Próximos passos</span>
            <span className="text-[11px] text-muted-foreground">sugeridos pela Lu</span>
          </div>
          {insight.missing.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Falta saber:</span> {insight.missing.join(' · ')}
            </p>
          )}
          {insight.nextSteps.map((step) => (
            <label key={step} className="flex items-start gap-2.5 text-[13px] min-h-7 cursor-pointer">
              <input
                type="checkbox"
                checked={done.has(step)}
                onChange={() => setDone((prev) => {
                  const next = new Set(prev);
                  if (next.has(step)) next.delete(step); else next.add(step);
                  return next;
                })}
                className="mt-0.5 w-4 h-4 accent-emerald-600"
              />
              <span className={cn('text-foreground', done.has(step) && 'line-through text-muted-foreground')}>{step}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export { LuOpportunityCard };
