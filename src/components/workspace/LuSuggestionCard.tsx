import React from 'react';
import { Sparkles, Send, Pencil, X, Loader2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [expanded, setExpanded] = React.useState(false);

  const visible = insight?.awaitingReply && insight.reply && dismissedFor !== insight.basedOnMessageId;

  if (!visible) {
    if (loading) {
      return (
        <div className="px-4 py-1.5 bg-muted flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" aria-hidden="true" />
          A Lu está lendo a conversa…
        </div>
      );
    }
    if (error) {
      return (
        <p className="px-4 py-1.5 bg-muted flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> {error}
        </p>
      );
    }
    return null;
  }

  // ~3 lines of the 15px body at the chat column's usual width.
  const isLong = insight.reply.length > 180;

  const chip = 'h-8 px-3.5 rounded-full text-[13px] font-medium border border-input bg-card text-primary hover:bg-accent transition-colors disabled:opacity-50 flex-shrink-0';

  return (
    // Docked on the composer bar like WhatsApp's reply bar — no floating card,
    // so the customer's last message stays in view above it.
    <div className="px-4 pt-2 pb-0.5 bg-muted border-t border-border flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
        <span className="text-[13px] font-medium text-primary whitespace-nowrap flex-shrink-0">Lu sugere</span>
        {insight.missing.length > 0 && (
          <span className="text-[13px] text-muted-foreground truncate">· falta saber: {insight.missing.slice(0, 2).join(', ')}</span>
        )}
        <span className="flex-1" />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
        <button
          type="button"
          aria-label="Dispensar sugestão"
          onClick={() => setDismissedFor(insight.basedOnMessageId)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-lg bg-card px-3 py-2">
        <p className={cn('text-[15px] leading-[21px] text-foreground whitespace-pre-line', !expanded && 'line-clamp-3', loading && 'opacity-60')}>{insight.reply}</p>
        {isLong && (
          <button type="button" onClick={() => setExpanded(v => !v)} className="mt-0.5 text-[13px] font-medium text-primary hover:underline">
            {expanded ? 'Mostrar menos' : 'Ler tudo'}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pb-1.5">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setDismissedFor(insight.basedOnMessageId);
            onSend(insight.reply);
          }}
          className="h-8 px-4 rounded-full text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" /> Enviar
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
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Editar antes
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={loading}
              title="Outras versões"
              aria-label="Outras versões da sugestão"
              className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent data-[state=open]:bg-secondary disabled:opacity-50 flex-shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuItem onSelect={() => onRegenerate('shorter')}>Mais curta</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRegenerate('alternative')}>Outra versão</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export { LuSuggestionCard };
