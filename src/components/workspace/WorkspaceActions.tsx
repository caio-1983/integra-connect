import React, { useState } from 'react';
import { Info, ArrowRightLeft, CheckCircle, Tag, CalendarClock, TrendingUp, MailX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TeamMemberOption {
  /** team_members.id — what onTransfer sends, and what deals.owner_id stores. */
  id: string;
  name: string;
  /** auth.users.id — what conversations.assigned_user_id stores. */
  user_id?: string | null;
}

interface WorkspaceActionsProps {
  showCustomerPanel: boolean;
  onToggleCustomerPanel: () => void;
  teamMembers: TeamMemberOption[];
  assignedUserId?: string | null;
  onTransfer: (userId: string) => void;
  onMarkAsUnread: () => void;
}

/** Atendente pode transferir a conversa pra qualquer outro membro da equipe. */
const TransferPopover: React.FC<{
  teamMembers: TeamMemberOption[];
  assignedUserId?: string | null;
  onTransfer: (userId: string) => void;
}> = ({ teamMembers, assignedUserId, onTransfer }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Transferir conversa"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider px-2 pt-1 pb-2">Transferir para</p>
        <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
          {teamMembers.length === 0 && (
            <p className="text-xs text-muted-foreground px-2.5 py-2">Nenhum membro disponível.</p>
          )}
          {teamMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => { onTransfer(member.id); setOpen(false); }}
              className={cn(
                'text-left text-sm px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors',
                // assignedUserId is an auth id, member.id is a team_members id —
                // comparing them directly never matched. Match on user_id.
                member.user_id && member.user_id === assignedUserId ? 'text-primary font-medium' : 'text-foreground',
              )}
            >
              {member.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const WorkspaceActions: React.FC<WorkspaceActionsProps> = ({
  showCustomerPanel, onToggleCustomerPanel, teamMembers, assignedUserId, onTransfer, onMarkAsUnread,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <TransferPopover teamMembers={teamMembers} assignedUserId={assignedUserId} onTransfer={onTransfer} />
      <button
        type="button"
        onClick={onMarkAsUnread}
        title="Marcar como não lida"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <MailX className="w-3.5 h-3.5" />
      </button>
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
