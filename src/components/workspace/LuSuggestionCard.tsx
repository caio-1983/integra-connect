import React from 'react';
import { Sparkles, Send, Pencil, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationInsight, InsightMode } from '@/ai/types';

interface LuSuggestionCardProps {
  insight: ConversationInsight | null;
  loading: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  onRegenerate: (mode: Exclude<InsightMode, 'default'>) => void;
}

/**
 * Lu's draft reply above the composer. It appears on its own when the customer
 * spoke last — the attendant sends it as is, edits it first, or asks for another
 * version. Nothing is sent without a click.
 */
const LuSuggestionCard: React.FC<LuSuggestionCardProps> = ({ insight, loading, error, onSend, onEdit, onRegenerate }) => {
  const [dismissedFor, setDismissedFor] = React.useState<string | null>(null);

  const visible = insight?.awaitingReply && insight.reply && dismissedFor !== insight.basedOnMessageId;

  if (!visible) {
    if (loading) {
      return (
        <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          A Lu está lendo a conversa…
        </div>
      );
    }
    if (error) {
      return (
        <p className="mx-4 mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" /> {error}
        </p>
      );
    }
    return null;
  }

  const chip = 'h-8 px-3 rounded-full text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50';

  return (
    <div className="mx-4 mb-2 rounded-xl border border-accent/30 bg-card p-3 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-xs font-bold text-accent">Lu sugere</span>
        {insight.missing.length > 0 && (
          <span className="text-xs text-muted-foreground truncate">· falta saber: {insight.missing.slice(0, 2).join(', ')}</span>
        )}
        <span className="flex-1" />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        <button
          type="button"
          aria-label="Dispensar sugestão"
          onClick={() => setDismissedFor(insight.basedOnMessageId)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className={cn('text-sm leading-relaxed text-foreground whitespace-pre-line', loading && 'opacity-60')}>{insight.reply}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setDismissedFor(insight.basedOnMessageId);
            onSend(insight.reply);
          }}
          className="h-8 px-3.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Enviar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setDismissedFor(insight.basedOnMessageId);
            onEdit(insight.reply);
          }}
          className={cn(chip, 'flex items-center gap-1.5')}
        >
          <Pencil className="w-3.5 h-3.5" /> Editar antes
        </button>
        <button type="button" disabled={loading} onClick={() => onRegenerate('shorter')} className={chip}>Mais curta</button>
        <button type="button" disabled={loading} onClick={() => onRegenerate('alternative')} className={chip}>Outra versão</button>
      </div>
    </div>
  );
};

export { LuSuggestionCard };
