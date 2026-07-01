import React from 'react';
import { Clock, CalendarClock, FileText, Loader2 } from 'lucide-react';
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
    <div className="flex flex-col gap-5 px-4">
      {/* Interaction summary */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Histórico
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Conversas</p>
            <p className="text-lg font-bold text-foreground leading-none">{interaction_summary.total_conversations}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Padrão</p>
            <p className="text-xs font-medium text-foreground capitalize leading-tight mt-1">{interaction_summary.response_pattern}</p>
          </div>
        </div>

        {interaction_summary.last_contact_reason && (
          <div className="p-2.5 rounded-lg bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Último motivo</p>
            <p className="text-xs text-foreground">{interaction_summary.last_contact_reason}</p>
          </div>
        )}
      </div>

      {/* Protocols & returns — infrastructure */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3" />
          Protocolos & Retornos
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 normal-case tracking-normal">Em breve</span>
        </p>
        <div className="p-3 rounded-lg border border-dashed border-border text-center">
          <p className="text-[11px] text-muted-foreground">Protocolos e retornos agendados aparecerão aqui.</p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          Observações
          {isSavingNotes && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
        </p>
        <textarea
          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/50 focus:border-ring/50 outline-none resize-none transition-all"
          rows={4}
          placeholder="Adicione observações sobre este contato..."
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={onNotesBlur}
        />
      </div>
    </div>
  );
};

export { HistoryCard };
