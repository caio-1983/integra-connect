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
        <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-cyan-500 to-teal-600 shadow-sm mb-2.5">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-full h-full rounded-full object-cover border-2 border-background"
          />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-0.5">{conversation.contactName}</h3>
        <p className="text-[11px] text-muted-foreground">{STAGE_LABELS[stage] || stage}</p>
      </div>

      {/* Contact data */}
      <div className="px-4 space-y-2.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contato</p>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            <Phone className="w-3 h-3 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Telefone</p>
            <p className="text-xs text-foreground font-medium">{conversation.contactPhone}</p>
          </div>
        </div>

        {conversation.contactEmail && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <Mail className="w-3 h-3 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Email</p>
              <p className="text-xs text-foreground font-medium truncate max-w-[160px]">{conversation.contactEmail}</p>
            </div>
          </div>
        )}

        {/* Canal: WhatsApp — always present */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-[10px]">📱</span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Canal</p>
            <p className="text-xs text-foreground font-medium">WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Responsible */}
      <div className="px-4 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3 h-3" />
          Responsável
        </p>
        <select
          value={conversation.assignedUserId || ''}
          onChange={(e) => onAssignUser(e.target.value || null)}
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring/50 focus:border-ring/50 outline-none transition-all"
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
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tags</p>
          <Popover open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen}>
            <PopoverTrigger asChild>
              <button className="text-primary hover:text-primary/80 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-card border-border" align="end">
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
                    backgroundColor: tagDef?.color ? `${tagDef.color}20` : 'rgba(59,130,246,0.12)',
                    borderColor: tagDef?.color || '#3b82f6',
                  }}
                  className="px-1.5 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 group"
                >
                  <span className="text-foreground">{tagDef?.label || tagKey}</span>
                  <button
                    onClick={() => onToggleTag(tagKey)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </span>
              );
            })
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Nenhuma tag</p>
          )}
        </div>
      </div>
    </div>
  );
};

export { CustomerCard };
