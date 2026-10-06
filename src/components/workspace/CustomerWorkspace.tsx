import React from 'react';
import { UIConversation, TagDefinition } from '@/types';
import { CustomerIdentity, CustomerDetails } from './CustomerCard';
import { HistoryCard } from './HistoryCard';
import { CopilotPanel } from './CopilotPanel';
import { LuOpportunityCard } from './LuOpportunityCard';
import type { ConversationInsight } from '@/ai/types';
import { AgendamentoBlock } from '@/components/crm/AgendamentoBlock';
import { TarefasBlock } from '@/components/crm/TarefasBlock';
import { CalendarCheck, CheckSquare, ChevronDown, NotebookPen, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerWorkspaceProps {
  conversation: UIConversation;
  sdrName: string;
  /** Members who can see this conversation's number — the "Responsável" options. */
  teamMembers: any[];
  /** The whole team — task assignees don't need access to the number. */
  allTeamMembers: any[];
  availableTags: TagDefinition[];
  isTagSelectorOpen: boolean;
  setIsTagSelectorOpen: (v: boolean) => void;
  notesValue: string;
  setNotesValue: (v: string) => void;
  isSavingNotes: boolean;
  onToggleTag: (tagKey: string) => void;
  onCreateTag: (tag: { key: string; label: string; color: string; category: string }) => void;
  onNotesBlur: () => void;
  onAssignUser: (userId: string | null) => void;
  /** Opens the Salvar/Editar contato dialog. */
  onEditContact?: () => void;
  /** Lu's reading of the conversation (need, fields, next steps) — shared with the suggestion card. */
  insight: ConversationInsight | null;
  insightLoading: boolean;
  /** Closes the panel (the X in its header, like WhatsApp's contact info). */
  onClose?: () => void;
  className?: string;
}

// Every row starts closed: the panel opens showing only who the customer is
// and the opportunity; the rest is one click away.
const CollapsibleRow: React.FC<{
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full h-[52px] flex items-center gap-4 px-5 text-left hover:bg-accent transition-colors"
      >
        <Icon className="w-5 h-5 text-icon flex-shrink-0" aria-hidden="true" />
        <span className="text-[15px] text-foreground flex-1">{title}</span>
        <ChevronDown className={cn('w-4 h-4 text-icon transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
};

const CustomerWorkspace: React.FC<CustomerWorkspaceProps> = ({
  conversation,
  teamMembers,
  allTeamMembers,
  availableTags,
  isTagSelectorOpen,
  setIsTagSelectorOpen,
  notesValue,
  setNotesValue,
  isSavingNotes,
  onToggleTag,
  onCreateTag,
  onNotesBlur,
  onAssignUser,
  onEditContact,
  insight,
  insightLoading,
  onClose,
  className,
}) => {
  const contactId = conversation.contactId;

  return (
    <div className={cn("w-80 xl:w-[340px] border-l border-border bg-card flex flex-col flex-shrink-0 overflow-hidden", className)}>
      <div className="h-[60px] flex items-center gap-6 px-4 bg-muted flex-shrink-0">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar detalhes"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-icon hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-base text-foreground">Detalhes</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
          <div className="flex flex-col gap-3">
            <CustomerIdentity conversation={conversation} onEditContact={onEditContact} />

            {/* Oportunidade + próximos passos: o que a Lu leu da conversa */}
            <LuOpportunityCard contactId={contactId} insight={insight} loading={insightLoading} />

            <div className="flex flex-col">
              {/* Always open — the summary is what someone picking up the conversation reads first. */}
              <div className="py-3">
                <CopilotPanel conversation={conversation} sdrName="Lu" />
              </div>
              <CollapsibleRow title="Agendamento" icon={CalendarCheck}>
                <AgendamentoBlock contactId={contactId} contactName={conversation.contactName} />
              </CollapsibleRow>
              <CollapsibleRow title="Tarefas" icon={CheckSquare}>
                {/* Anyone on the team can get a task — not only who can see this number. */}
                <TarefasBlock contactId={contactId} teamMembers={allTeamMembers} />
              </CollapsibleRow>
              <CollapsibleRow title="Observações" icon={NotebookPen}>
                <HistoryCard
                  conversation={conversation}
                  notesValue={notesValue}
                  setNotesValue={setNotesValue}
                  isSavingNotes={isSavingNotes}
                  onNotesBlur={onNotesBlur}
                />
              </CollapsibleRow>
              <CollapsibleRow title="Dados do contato" icon={UserRound}>
                <CustomerDetails
                  conversation={conversation}
                  teamMembers={teamMembers}
                  availableTags={availableTags}
                  isTagSelectorOpen={isTagSelectorOpen}
                  setIsTagSelectorOpen={setIsTagSelectorOpen}
                  onToggleTag={onToggleTag}
                  onCreateTag={onCreateTag}
                  onAssignUser={onAssignUser}
                />
              </CollapsibleRow>
            </div>
          </div>
      </div>
    </div>
  );
};

export { CustomerWorkspace };
