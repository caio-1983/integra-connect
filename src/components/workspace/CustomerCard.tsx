import React from 'react';
import { User, Plus, X } from 'lucide-react';
import { UIConversation, TagDefinition } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelector } from '@/components/TagSelector';
import { LeadOriginCard } from '@/components/workspace/LeadOriginCard';

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

/** Compact identity line at the top of the panel — channel already shows in the conversation header. */
const CustomerIdentity: React.FC<{ conversation: UIConversation }> = ({ conversation }) => {
  const stage = conversation.clientMemory.lead_profile.lead_stage;
  return (
    <div className="flex items-center gap-3 px-4">
      <img
        src={conversation.contactAvatar}
        alt=""
        className="w-11 h-11 rounded-full object-cover border border-border flex-shrink-0"
      />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-foreground truncate">{conversation.contactName}</h3>
        <p className="text-xs text-muted-foreground truncate">
          {conversation.contactPhone}{stage ? ` · ${STAGE_LABELS[stage] || stage}` : ''}
        </p>
      </div>
    </div>
  );
};

/** Origin, owner and tags — reference data, kept behind a collapsed row. */
const CustomerDetails: React.FC<CustomerCardProps> = ({
  conversation,
  teamMembers,
  availableTags,
  isTagSelectorOpen,
  setIsTagSelectorOpen,
  onToggleTag,
  onCreateTag,
  onAssignUser,
}) => (
  <div className="flex flex-col gap-4 pt-1">
    {/* Origem do lead — leitura e correção manual (organico/indicacao/offline
        não têm como ser rastreados automaticamente). */}
    <LeadOriginCard contactId={conversation.contactId} channel={conversation.primaryChannel} />

    <div className="px-4 space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <User className="w-3.5 h-3.5" />
        Responsável
      </p>
      {/* O valor do select é um team_members.id (é o que onAssignUser espera),
          mas conversation.assignedUserId é um auth.users.id — por isso a
          seleção atual é resolvida pelo user_id do membro, não por igualdade. */}
      <select
        value={teamMembers.find((m) => m.user_id && m.user_id === conversation.assignedUserId)?.id ?? ''}
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

    <div className="px-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Tags</p>
        <Popover open={isTagSelectorOpen} onOpenChange={setIsTagSelectorOpen}>
          <PopoverTrigger asChild>
            <button aria-label="Adicionar tag" className="text-primary hover:text-primary/80 transition-colors">
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
                  title="Remover tag"
                  aria-label={`Remover tag ${tagDef?.label || tagKey}`}
                  className="opacity-60 hover:opacity-100 transition-opacity"
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

const CustomerCard: React.FC<CustomerCardProps> = (props) => (
  <div className="flex flex-col gap-4">
    <CustomerIdentity conversation={props.conversation} />
    <CustomerDetails {...props} />
  </div>
);

export { CustomerCard, CustomerIdentity, CustomerDetails };
