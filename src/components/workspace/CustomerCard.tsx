import React from 'react';
import { Phone, Mail, User, Plus, X } from 'lucide-react';
import { UIConversation, TagDefinition } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';

interface CustomerCardProps {
  conversation: UIConversation;
  teamMembers: any[];
  availableTags: TagDefinition[];
  isTagSelectorOpen: boolean;
  setIsTagSelectorOpen: (v: boolean) => void;
  onToggleTag: (tagKey: string) => void;
  onCreateTag: (tag: { key: string; label: string; color: string; category: string }) => void;
  onAssignUser: (userId: string | null) => void;
}

const STAGE_LABELS: Record<string, string> = {
  new:       'Novo Contato',
  qualified: 'Contato Qualificado',
  demo:      'Em Demonstração',
  closed:    'Fechado',
};

const CustomerCard: React.FC<CustomerCardProps> = ({
  conversation,
  teamMembers,
  availableTags,
  isTagSelectorOpen,
  setIsTagSelectorOpen,
  onToggleTag,
  onCreateTag,
  onAssignUser,
}) => {
  const stage = conversation.clientMemory.lead_profile.lead_stage;

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + identity */}
      <div className="flex flex-col items-center text-center px-4 pt-2">
        <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-cyan-500 to-teal-600 shadow-lg mb-2.5">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-full h-full rounded-full object-cover border-2 border-slate-900"
          />
        </div>
        <h3 className="text-sm font-bold text-white mb-0.5">{conversation.contactName}</h3>
        <p className="text-[11px] text-slate-400">{STAGE_LABELS[stage] || stage}</p>
      </div>

      {/* Contact data */}
      <div className="px-4 space-y-2.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contato</p>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Phone className="w-3 h-3 text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 leading-none mb-0.5">Telefone</p>
            <p className="text-xs text-slate-200 font-medium">{conversation.contactPhone}</p>
          </div>
        </div>

        {conversation.contactEmail && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Mail className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-none mb-0.5">Email</p>
              <p className="text-xs text-slate-200 font-medium truncate max-w-[160px]">{conversation.contactEmail}</p>
            </div>
          </div>
        )}

        {/* Canal: WhatsApp — always present */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px]">📱</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 leading-none mb-0.5">Canal</p>
            <p className="text-xs text-slate-200 font-medium">WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Responsible */}
      <div className="px-4 space-y-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3 h-3" />
          Responsável
        </p>
        <select
          value={conversation.assignedUserId || ''}
          onChange={(e) => onAssignUser(e.target.value || null)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
        >
          <option value="">Não atribuído</option>
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tags</p>
          <Popover open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen}>
            <PopoverTrigger asChild>
              <button className="text-cyan-500 hover:text-cyan-400 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-slate-900 border-slate-700" align="end">
              <TagSelector
                availableTags={availableTags}
                selectedTags={conversation.tags || []}
                onToggleTag={onToggleTag}
                onCreateTag={onCreateTag}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {conversation.tags && conversation.tags.length > 0 ? (
            conversation.tags.map((tagKey) => {
              const tagDef = availableTags.find((t) => t.key === tagKey);
              return (
                <span
                  key={tagKey}
                  style={{
                    backgroundColor: tagDef?.color ? `${tagDef.color}20` : 'rgba(59,130,246,0.2)',
                    borderColor: tagDef?.color || '#3b82f6',
                  }}
                  className="px-1.5 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 group"
                >
                  <span className="text-slate-200">{tagDef?.label || tagKey}</span>
                  <button
                    onClick={() => onToggleTag(tagKey)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-slate-400 hover:text-slate-200" />
                  </button>
                </span>
              );
            })
          ) : (
            <p className="text-[11px] text-slate-600 italic">Nenhuma tag</p>
          )}
        </div>
      </div>
    </div>
  );
};

export { CustomerCard };
