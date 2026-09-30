import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { UIConversation } from '@/types';

interface HistoryCardProps {
  conversation: UIConversation;
  notesValue: string;
  setNotesValue: (v: string) => void;
  isSavingNotes: boolean;
  onNotesBlur: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  conversation,
  notesValue,
  setNotesValue,
  isSavingNotes,
  onNotesBlur,
}) => {
  const { interaction_summary } = conversation.clientMemory;

  return (
    <div className="flex flex-col gap-4 px-4">
      {/* Notes */}
      <div className="space-y-2">
        {/* The collapsed row above already titles this block "Observações". */}
        {isSavingNotes && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-primary" /> Salvando…
          </p>
        )}
        <textarea
          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/50 focus:border-ring/50 outline-none resize-none transition-all"
          aria-label="Observações"
          rows={4}
          placeholder="Adicione observações sobre este contato..."
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={onNotesBlur}
        />
      </div>

      {/* Interaction summary — compact, below notes */}
      <div className="space-y-1.5">
        <p className="text-sm text-primary flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Histórico
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span><span className="font-semibold text-foreground">{interaction_summary.total_conversations}</span> conversas</span>
          {interaction_summary.response_pattern && (
            <span className="capitalize truncate">· {interaction_summary.response_pattern}</span>
          )}
        </div>
        {interaction_summary.last_contact_reason && (
          <p className="text-[11px] text-muted-foreground truncate">
            Último motivo: <span className="text-foreground">{interaction_summary.last_contact_reason}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export { HistoryCard };
