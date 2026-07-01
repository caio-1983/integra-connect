import React from 'react';
import { UIConversation, TagDefinition } from '@/types';
import { CustomerCard } from './CustomerCard';
import { HistoryCard } from './HistoryCard';
import { AIPanel } from './AIPanel';

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
  return (
    <div className="w-64 xl:w-72 border-l border-slate-800 bg-slate-900/50 flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-800 flex-shrink-0">
        <span className="text-xs font-bold text-white uppercase tracking-wider">Workspace do Cliente</span>
      </div>

      {/* Scrollable content — no tabs, all sections always visible */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 flex flex-col gap-5">

        {/* Seção: Cliente */}
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

        <div className="h-px bg-slate-800/60 mx-4" />

        {/* Seção: Histórico */}
        <HistoryCard
          conversation={conversation}
          notesValue={notesValue}
          setNotesValue={setNotesValue}
          isSavingNotes={isSavingNotes}
          onNotesBlur={onNotesBlur}
        />

        <div className="h-px bg-slate-800/60 mx-4" />

        {/* Seção: IA */}
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
