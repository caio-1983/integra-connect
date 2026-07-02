import React from 'react';
import { UIConversation, TagDefinition } from '@/types';
import { MOCK_PEOPLE, MOCK_COMPANIES, MOCK_DEALS, MOCK_TASKS, MOCK_TIMELINE_ENTRIES, MOCK_APPOINTMENTS } from '@/constants';
import { CustomerCard } from './CustomerCard';
import { HistoryCard } from './HistoryCard';
import { AIPanel } from './AIPanel';
import { CompanyBlock } from '@/components/crm/CompanyBlock';
import { DealSummary } from '@/components/crm/DealSummary';
import { RetornosBlock } from '@/components/crm/RetornosBlock';
import { TaskList } from '@/components/crm/TaskList';
import { Timeline } from '@/components/crm/Timeline';
import {
  Building2, TrendingUp, CalendarCheck, CheckSquare,
  History, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerWorkspaceProps {
  conversation: UIConversation;
  sdrName: string;
  teamMembers: any[];
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
}

// Collapsible section wrapper
const WorkspaceSection: React.FC<{
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon: Icon, defaultOpen = true, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 group"
      >
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex-1 text-left">
          {title}
        </span>
        {open
          ? <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
          : <ChevronRight className="w-3 h-3 text-muted-foreground/60" />}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
};

const CustomerWorkspace: React.FC<CustomerWorkspaceProps> = ({
  conversation,
  sdrName,
  teamMembers,
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
}) => {
  // Look up CRM data by contactId
  const contactId = conversation.contactId;
  const person = MOCK_PEOPLE.find(p => p.id === contactId);
  const company = person?.companyId ? MOCK_COMPANIES.find(c => c.id === person.companyId) : undefined;
  const deals = MOCK_DEALS.filter(d => d.contactId === contactId);
  const tasks = MOCK_TASKS.filter(t => t.personId === contactId).slice(0, 4);
  const appointments = MOCK_APPOINTMENTS.filter(a => a.contact_id === contactId);
  const timeline = MOCK_TIMELINE_ENTRIES.filter(e => e.personId === contactId).slice(0, 6);

  return (
    <div className="w-64 xl:w-72 border-l border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-border flex-shrink-0">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Workspace do Cliente</span>
      </div>

      {/* Scrollable content — no tabs, all sections in scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 flex flex-col gap-1">

        {/* ── 1. CLIENTE ── */}
        <CustomerCard
          conversation={conversation}
          teamMembers={teamMembers}
          availableTags={availableTags}
          isTagSelectorOpen={isTagSelectorOpen}
          setIsTagSelectorOpen={setIsTagSelectorOpen}
          onToggleTag={onToggleTag}
          onCreateTag={onCreateTag}
          onAssignUser={onAssignUser}
        />

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 2. EMPRESA ── */}
        <WorkspaceSection title="Empresa" icon={Building2} defaultOpen={true}>
          <CompanyBlock
            company={company}
            companyName={person?.company ?? conversation.contactName}
          />
        </WorkspaceSection>

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 3. NEGÓCIO ATUAL ── */}
        <WorkspaceSection title="Negócio Atual" icon={TrendingUp} defaultOpen={true}>
          <DealSummary
            deals={deals}
            contactId={contactId}
            contactName={conversation.contactName}
          />
        </WorkspaceSection>

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 4. RETORNOS ── */}
        <WorkspaceSection title="Retornos" icon={CalendarCheck} defaultOpen={true}>
          <RetornosBlock appointments={appointments} />
        </WorkspaceSection>

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 5. TAREFAS ── */}
        <WorkspaceSection title="Tarefas" icon={CheckSquare} defaultOpen={true}>
          {tasks.length === 0 ? (
            <div className="px-4 py-2 text-xs text-muted-foreground text-center">
              Nenhuma tarefa vinculada
            </div>
          ) : (
            <div className="px-4">
              <TaskList tasks={tasks} compact />
            </div>
          )}
        </WorkspaceSection>

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 6. NOTAS (HistoryCard existente) ── */}
        <HistoryCard
          conversation={conversation}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          isSavingNotes={isSavingNotes}
          onNotesBlur={onNotesBlur}
        />

        {timeline.length > 0 && (
          <>
            <div className="h-px bg-border mx-4 my-1" />

            {/* ── 7. TIMELINE ── */}
            <WorkspaceSection title="Timeline" icon={History} defaultOpen={false}>
              <div className="px-4 pt-1">
                <Timeline entries={timeline} compact />
              </div>
            </WorkspaceSection>
          </>
        )}

        <div className="h-px bg-border mx-4 my-1" />

        {/* ── 8. IA ── */}
        <AIPanel
          conversation={conversation}
          sdrName={sdrName}
        />

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export { CustomerWorkspace };
