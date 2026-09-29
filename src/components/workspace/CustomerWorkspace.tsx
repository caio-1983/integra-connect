import React from 'react';
import { UIConversation, TagDefinition } from '@/types';
import { CustomerIdentity, CustomerDetails } from './CustomerCard';
import { HistoryCard } from './HistoryCard';
import { CopilotPanel } from './CopilotPanel';
import { LuOpportunityCard } from './LuOpportunityCard';
import type { ConversationInsight } from '@/ai/types';
import { AgendamentoBlock } from '@/components/crm/AgendamentoBlock';
import { TarefasBlock } from '@/components/crm/TarefasBlock';
import { CalendarCheck, CheckSquare, ChevronDown, NotebookPen, UserRound } from 'lucide-react';
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
  /** Lu's reading of the conversation (need, fields, next steps) — shared with the suggestion card. */
  insight: ConversationInsight | null;
  insightLoading: boolean;
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
        className="w-full h-11 flex items-center gap-2.5 px-4 text-left hover:bg-muted/50 transition-colors"
      >
        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-[13px] font-semibold text-foreground flex-1">{title}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
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
  insight,
  insightLoading,
}) => {
  const contactId = conversation.contactId;

  return (
    <div className="w-80 xl:w-[340px] border-l border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
      <div className="h-14 flex items-center px-4 border-b border-border flex-shrink-0">
        <h2 className="text-[15px] font-bold text-foreground">Detalhes</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
          <div className="flex flex-col gap-4">
            <CustomerIdentity conversation={conversation} />

            {/* Oportunidade + próximos passos: o que a Lu leu da conversa */}
            <LuOpportunityCard contactId={contactId} insight={insight} loading={insightLoading} />

            <div className="flex flex-col">
              {/* Always open — the summary is what someone picking up the conversation reads first. */}
              <div className="border-t border-border py-3">
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
