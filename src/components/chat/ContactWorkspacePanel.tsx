import React, { useState } from 'react';
import { X, Phone, Mail, Brain, User, Plus, Loader2 } from 'lucide-react';
import { UIConversation, TagDefinition } from '@/types';
import { TagSelector } from '@/components/TagSelector';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ContactWorkspacePanelProps {
  activeChat: UIConversation;
  teamMembers: any[];
  availableTags: TagDefinition[];
  notesValue: string;
  isSavingNotes: boolean;
  sdrName: string;
  onClose: () => void;
  onToggleTag: (tagKey: string) => void;
  onCreateTag: (tag: { key: string; label: string; color: string; category: string }) => void;
  onAssign: (userId: string | null) => void;
  onNotesChange: (value: string) => void;
  onNotesBlur: () => void;
}

const ContactWorkspacePanel: React.FC<ContactWorkspacePanelProps> = ({
  activeChat,
  teamMembers,
  availableTags,
  notesValue,
  isSavingNotes,
  sdrName,
  onClose,
  onToggleTag,
  onCreateTag,
  onAssign,
  onNotesChange,
  onNotesBlur,
}) => {
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  return (
    <div className="w-80 h-full flex flex-col">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 flex-shrink-0">
        <span className="font-semibold text-white">Informações do Lead</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-cyan-500 to-teal-600 shadow-xl mb-4">
            <img
              src={activeChat.contactAvatar}
              alt={activeChat.contactName}
              className="w-full h-full rounded-full object-cover border-2 border-slate-900"
            />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{activeChat.contactName}</h3>
          <p className="text-sm text-slate-400 mb-4">
            {activeChat.clientMemory.lead_profile.lead_stage === 'new' ? 'Novo Lead' :
             activeChat.clientMemory.lead_profile.lead_stage === 'qualified' ? 'Lead Qualificado' :
             activeChat.clientMemory.lead_profile.lead_stage}
          </p>
        </div>

        {/* Contact Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dados de Contato</h4>

          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Telefone</span>
              <span className="text-slate-200 font-medium">{activeChat.contactPhone}</span>
            </div>
          </div>

          {activeChat.contactEmail && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Email</span>
                <span className="text-slate-200 font-medium">{activeChat.contactEmail}</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-slate-800/50 w-full" />

        {/* AI Memory */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Memória do(a) {sdrName}
          </h4>

          {activeChat.clientMemory.lead_profile.interests.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="text-xs text-slate-400">Interesses</span>
              <p className="text-sm text-slate-200 mt-1">
                {activeChat.clientMemory.lead_profile.interests.join(', ')}
              </p>
            </div>
          )}

          {activeChat.clientMemory.sales_intelligence.pain_points.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="text-xs text-slate-400">Dores Identificadas</span>
              <p className="text-sm text-slate-200 mt-1">
                {activeChat.clientMemory.sales_intelligence.pain_points.join(', ')}
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs text-slate-400">Próxima Ação Sugerida</span>
            <p className="text-sm text-slate-200 mt-1">
              {activeChat.clientMemory.sales_intelligence.next_best_action === 'qualify' ? 'Qualificar lead' :
               activeChat.clientMemory.sales_intelligence.next_best_action === 'demo' ? 'Agendar demonstração' :
               activeChat.clientMemory.sales_intelligence.next_best_action}
            </p>
          </div>

          <div className="text-xs text-slate-500 text-center">
            Total de conversas: {activeChat.clientMemory.interaction_summary.total_conversations}
          </div>
        </div>

        <div className="h-px bg-slate-800/50 w-full" />

        {/* Assigned User */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4" />
            Responsável
          </h4>
          <select
            value={activeChat.assignedUserId || ''}
            onChange={(e) => onAssign(e.target.value || null)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
          >
            <option value="">Não atribuído</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
        </div>

        <div className="h-px bg-slate-800/50 w-full" />

        {/* Tags */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            Tags
            <Popover open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen}>
              <PopoverTrigger asChild>
                <button className="text-cyan-500 hover:text-cyan-400 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-slate-900 border-slate-700" align="end">
                <TagSelector
                  availableTags={availableTags}
                  selectedTags={activeChat.tags || []}
                  onToggleTag={onToggleTag}
                  onCreateTag={onCreateTag}
                />
              </PopoverContent>
            </Popover>
          </h4>
          <div className="flex flex-wrap gap-2">
            {activeChat.tags && activeChat.tags.length > 0 ? (
              activeChat.tags.map(tagKey => {
                const tagDef = availableTags.find(t => t.key === tagKey);
                return (
                  <span
                    key={tagKey}
                    style={{
                      backgroundColor: tagDef?.color ? `${tagDef.color}20` : 'rgba(59, 130, 246, 0.2)',
                      borderColor: tagDef?.color || '#3b82f6',
                    }}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1.5 group hover:brightness-110 transition-all"
                  >
                    <span className="text-slate-200">{tagDef?.label || tagKey}</span>
                    <button
                      onClick={() => onToggleTag(tagKey)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-slate-400 hover:text-slate-200" />
                    </button>
                  </span>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhuma tag adicionada</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            Notas Internas
            {isSavingNotes && <Loader2 className="w-3 h-3 animate-spin text-cyan-500" />}
          </h4>
          <textarea
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none resize-none transition-all"
            rows={4}
            placeholder="Adicione observações sobre este lead..."
            value={notesValue}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
          />
        </div>
      </div>
    </div>
  );
};

export default ContactWorkspacePanel;
