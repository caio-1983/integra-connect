import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Check, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { requestLeadQualification } from '@/ai/services/backendAgentClient';
import { ClientMemory, LeadQualification, QualificationKey } from '../types';
import { cn } from '@/lib/utils';

const CRITERIA: { key: QualificationKey; label: string; placeholder: string }[] = [
  { key: 'need', label: 'Necessidade', placeholder: 'Ex.: iluminação da loja, já tem projeto' },
  { key: 'budget', label: 'Orçamento', placeholder: 'Ex.: até R$ 5 mil' },
  { key: 'timeline', label: 'Prazo de decisão', placeholder: 'Ex.: obra termina em dezembro' },
  { key: 'decider', label: 'Quem decide', placeholder: 'Ex.: o próprio cliente, arquiteto' },
];

const score = (q: LeadQualification) => CRITERIA.filter(c => q[c.key]?.value?.trim()).length * 25;

/** Keeps the legacy fields other screens read in step with the qualification. */
function withQualification(memory: ClientMemory, q: LeadQualification): ClientMemory {
  return {
    ...memory,
    qualification: q,
    last_updated: new Date().toISOString(),
    lead_profile: { ...memory.lead_profile, qualification_score: score(q) },
    sales_intelligence: {
      ...memory.sales_intelligence,
      budget_indication: q.budget?.value || 'unknown',
      decision_timeline: q.timeline?.value || 'unknown',
    },
  };
}

interface Props {
  contactId: string;
  conversationId?: string;
  memory: ClientMemory;
  sdrName?: string;
  onChange: (memory: ClientMemory) => void;
}

/** BANT-style qualification: Lu suggests from the conversation, the attendant corrects (and wins). */
export const LeadQualificationCard: React.FC<Props> = ({ contactId, conversationId, memory, sdrName, onChange }) => {
  const q = memory.qualification ?? {};
  const pct = score(q);
  // The assistant is "Lu" on screen; the company setting carries the long form ("Lumina").
  const luName = sdrName ? 'Lu' : 'a IA';
  const [editing, setEditing] = useState<QualificationKey | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => { setEditing(null); }, [contactId]);

  const startEdit = (key: QualificationKey) => {
    setEditing(key);
    setDraft(q[key]?.value ?? '');
  };

  const save = async (key: QualificationKey) => {
    const value = draft.trim();
    const next: LeadQualification = { ...q };
    if (value) next[key] = { value, source: 'human', updated_at: new Date().toISOString() };
    else delete next[key];
    const updated = withQualification(memory, next);
    setSaving(true);
    try {
      await api.updateContactMemory(contactId, updated);
      onChange(updated);
      setEditing(null);
    } catch {
      toast.error('Não foi possível salvar a qualificação.');
    } finally {
      setSaving(false);
    }
  };

  const askLu = async () => {
    if (!conversationId) return;
    setAsking(true);
    try {
      onChange(await requestLeadQualification(conversationId));
      toast.success(`${luName} atualizou a qualificação.`);
    } catch (error) {
      // fetch() rejects with a bare TypeError ("Failed to fetch") when the backend is unreachable.
      toast.error(error instanceof TypeError
        ? `Não foi possível falar com ${sdrName ? 'a Lu' : 'a IA'} agora. Tente de novo em alguns minutos.`
        : error instanceof Error ? error.message : 'Erro ao qualificar o lead.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm text-primary">Qualificação do lead</h3>
        {conversationId && (
          <button
            type="button"
            onClick={askLu}
            disabled={asking}
            className="h-8 px-3 rounded-full text-xs text-primary hover:bg-accent flex items-center gap-1.5 disabled:opacity-60"
          >
            {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {asking ? 'Lendo a conversa…' : `Pedir para ${luName}`}
          </button>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Preenchida</span>
          <span className="text-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 w-full bg-secondary rounded-full h-1.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Qualificação">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-3">
        {CRITERIA.map(({ key, label, placeholder }) => {
          const field = q[key];
          const isEditing = editing === key;
          return (
            <li key={key} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{label}</span>
                {field && (
                  <span className={cn('text-[11px] px-1.5 rounded', field.source === 'lu' ? 'bg-success-subtle text-success' : 'bg-secondary text-muted-foreground')}>
                    {field.source === 'lu' ? `sugerido por ${luName}` : 'atendente'}
                  </span>
                )}
              </div>
              {isEditing ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !saving) save(key);
                      // Stop here: the deal panel closes on Escape, which would drop the draft.
                      if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); }
                    }}
                    placeholder={placeholder}
                    maxLength={200}
                    className="flex-1 h-9 px-3 rounded-md bg-secondary text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <button type="button" onClick={() => save(key)} disabled={saving} aria-label="Salvar" className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-accent">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} aria-label="Cancelar" className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(key)}
                  aria-label={`${label}: ${field?.value || 'não informado'}. Editar`}
                  className="group mt-0.5 w-full text-left flex items-center gap-2 text-[15px]"
                >
                  <span className={field ? 'text-foreground' : 'text-muted-foreground italic'}>
                    {field?.value || 'Não informado'}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-icon opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
