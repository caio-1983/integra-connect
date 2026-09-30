import React from 'react';
import { Info, ArrowRightLeft, MailX, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  /** Members who can see this conversation's number — the only valid transfer targets. */
  teamMembers: TeamMemberOption[];
  assignedUserId?: string | null;
  onTransfer: (userId: string) => void;
  onMarkAsUnread: () => void;
}

// WhatsApp-style header actions: Detalhes as a round icon, the rest in ⋮.
// Transfer lives in the menu (each attendant usually has their own number, so
// it's rare) and only shows when someone else can actually receive it. The
// disabled "Em breve" placeholders (Finalizar, Etiquetas, Agendar retorno,
// Criar oportunidade) were removed.
const ICON_BUTTON = 'w-10 h-10 flex items-center justify-center rounded-full text-icon hover:bg-accent transition-colors';
const ITEM = 'gap-3';

const WorkspaceActions: React.FC<WorkspaceActionsProps> = ({
  showCustomerPanel, onToggleCustomerPanel, teamMembers, assignedUserId, onTransfer, onMarkAsUnread,
}) => {
  // assignedUserId is an auth id, member.id a team_members id — match on user_id.
  const transferTargets = teamMembers.filter((m) => !(m.user_id && m.user_id === assignedUserId));

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        type="button"
        onClick={onToggleCustomerPanel}
        title={showCustomerPanel ? 'Fechar detalhes' : 'Detalhes do contato'}
        aria-label={showCustomerPanel ? 'Fechar detalhes' : 'Detalhes do contato'}
        aria-pressed={showCustomerPanel}
        className={cn(ICON_BUTTON, showCustomerPanel && 'bg-secondary text-foreground')}
      >
        <Info className="w-5 h-5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" title="Mais opções" aria-label="Mais opções" className={cn(ICON_BUTTON, 'data-[state=open]:bg-secondary')}>
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem className={ITEM} onSelect={() => onMarkAsUnread()}>
            <MailX className="h-[18px] w-[18px] text-icon" /> Marcar como não lida
          </DropdownMenuItem>
          {transferTargets.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-3 pt-2 pb-1 text-sm font-normal text-primary flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transferir para
              </DropdownMenuLabel>
              <div className="max-h-56 overflow-y-auto">
                {transferTargets.map((member) => (
                  <DropdownMenuItem key={member.id} className={cn(ITEM, 'pl-9')} onSelect={() => onTransfer(member.id)}>
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export { WorkspaceActions };
