import React from 'react';
import { Bot, User, Pause, Info, ArrowRightLeft, CheckCircle, Tag, CalendarClock, TrendingUp } from 'lucide-react';
import { ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';

interface WorkspaceActionsProps {
  status: ConversationStatus;
  sdrName: string;
  showCustomerPanel: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onToggleCustomerPanel: () => void;
}

const WorkspaceActions: React.FC<WorkspaceActionsProps> = ({
  status, sdrName, showCustomerPanel, onStatusChange, onToggleCustomerPanel,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {/* Status switcher */}
      <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
        <button
          onClick={() => onStatusChange('nina')}
          title={`Ativar ${sdrName} (IA)`}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
            status === 'nina'
              ? 'bg-violet-100 text-violet-700'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{sdrName}</span>
        </button>
        <button
          onClick={() => onStatusChange('human')}
          title="Assumir conversa"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
            status === 'human'
              ? 'bg-emerald-100 text-emerald-700'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Humano</span>
        </button>
        <button
          onClick={() => onStatusChange('paused')}
          title="Pausar conversa"
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
            status === 'paused'
              ? 'bg-amber-100 text-amber-700'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Pause className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Pausar</span>
        </button>
      </div>

      <div className="w-px h-5 bg-border" />

      <button disabled title="Em breve: Transferir"         className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
      <button disabled title="Em breve: Finalizar"          className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><CheckCircle    className="w-3.5 h-3.5" /></button>
      <button disabled title="Em breve: Etiquetas"          className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Tag            className="w-3.5 h-3.5" /></button>
      <button disabled title="Em breve: Agendar retorno"    className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><CalendarClock  className="w-3.5 h-3.5" /></button>
      <button disabled title="Em breve: Criar oportunidade" className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><TrendingUp     className="w-3.5 h-3.5" /></button>

      <div className="w-px h-5 bg-border" />

      <button
        onClick={onToggleCustomerPanel}
        title="Workspace do cliente"
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          showCustomerPanel
            ? 'bg-muted text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export { WorkspaceActions };
