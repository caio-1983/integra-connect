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
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Histórico
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 mb-1">Conversas</p>
            <p className="text-lg font-bold text-slate-200 leading-none">{interaction_summary.total_conversations}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 mb-1">Padrão</p>
            <p className="text-xs font-medium text-slate-300 capitalize leading-tight mt-1">{interaction_summary.response_pattern}</p>
          </div>
        </div>

        {interaction_summary.last_contact_reason && (
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-[10px] text-slate-500 mb-1">Último motivo</p>
            <p className="text-xs text-slate-300">{interaction_summary.last_contact_reason}</p>
          </div>
        )}
      </div>

      {/* Protocols & returns — infrastructure */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3" />
          Protocolos & Retornos
          <span className="ml-auto text-[10px] font-normal text-slate-700 normal-case tracking-normal">Em breve</span>
        </p>
        <div className="p-3 rounded-lg border border-dashed border-slate-800 text-center">
          <p className="text-[11px] text-slate-600">Protocolos e retornos agendados aparecerão aqui.</p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          Observações
          {isSavingNotes && <Loader2 className="w-3 h-3 animate-spin text-cyan-500 ml-auto" />}
        </p>
        <textarea
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none resize-none transition-all"
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
