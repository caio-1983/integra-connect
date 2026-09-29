import React, { useEffect, useState } from 'react';
import { Search, Plus, Loader2, MessageSquare, Smartphone, ChevronDown, Archive, ArrowLeft } from 'lucide-react';
import { UIConversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { ConversationFilters, QueueFilter } from './ConversationFilters';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { useInstanceLabels } from '@/hooks/useInstanceLabels';
import { useInstanceAccessGrants } from '@/hooks/useInstanceAccessGrants';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import type { TaskDueKind } from '@/hooks/useMyTasks';

interface TeamMemberOption { id: string; name: string; user_id?: string | null }

interface ConversationQueueProps {
  conversations: UIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  sdrName: string;
  onNewConversation: () => void;
  /** Used both to name the assigned attendant on each row and to populate the
   *  "Atendente" filter. */
  teamMembers?: TeamMemberOption[];
  onMarkAsUnread?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onSetArchived?: (id: string, archived: boolean) => void;
  /** Controlled filter — lets the chat home's shortcuts ("Aguardando", "Minhas") drive the list. */
  activeFilter?: QueueFilter;
  onFilterChange?: (filter: QueueFilter) => void;
  /** Most urgent pending task of the logged-in attendant per contact — badge on the row. */
  taskBadgeByContact?: Map<string, { kind: TaskDueKind; label: string }>;
}

/** The customer spoke last and nobody on the team (or Lu) answered yet. */
export function isAwaitingReply(c: UIConversation): boolean {
  const last = c.messages[c.messages.length - 1];
  return !!last && last.fromType === 'user';
}

function applyFilter(
  conversations: UIConversation[],
  filter: QueueFilter,
  query: string,
  instance: string,
  userId: string | undefined,
): UIConversation[] {
  let result = conversations;
  if (instance !== 'all') {
    result = result.filter(c => c.instance === instance);
  }
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(c =>
      c.contactName.toLowerCase().includes(q) ||
      c.contactPhone.includes(q) ||
      c.lastMessage.toLowerCase().includes(q),
    );
  }
  switch (filter) {
    case 'unread': return result.filter(c => c.unreadCount > 0);
    case 'waiting': return result.filter(isAwaitingReply);
    case 'mine':   return result.filter(c => !!userId && c.assignedUserId === userId);
    case 'nina':   return result.filter(c => c.status === 'nina');
    case 'human':  return result.filter(c => c.status === 'human');
    case 'paused': return result.filter(c => c.status === 'paused');
    default:       return result;
  }
}

function buildCounts(conversations: UIConversation[], userId: string | undefined): Record<QueueFilter, number> {
  return {
    waiting: conversations.filter(isAwaitingReply).length,
    mine:   conversations.filter(c => !!userId && c.assignedUserId === userId).length,
    all:    conversations.length,
    unread: conversations.filter(c => c.unreadCount > 0).length,
    nina:   conversations.filter(c => c.status === 'nina').length,
    human:  conversations.filter(c => c.status === 'human').length,
    paused: conversations.filter(c => c.status === 'paused').length,
  };
}

const ConversationQueue: React.FC<ConversationQueueProps> = ({
  conversations, selectedId, onSelect, loading, sdrName, onNewConversation, teamMembers = [],
  onMarkAsUnread, onMarkAsRead, onSetArchived,
  activeFilter: controlledFilter, onFilterChange, taskBadgeByContact,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [localFilter, setLocalFilter] = useState<QueueFilter>('all');
  const activeFilter = controlledFilter ?? localFilter;
  const setActiveFilter = onFilterChange ?? setLocalFilter;
  const [instanceFilter, setInstanceFilter] = useState('all');
  const { instances: connectedInstances } = useWhatsappInstances();
  const { labels } = useInstanceLabels();
  const { grantsByInstance } = useInstanceAccessGrants();
  const { isAdmin } = useCompanySettings();
  const { user } = useAuth();
  const [privateInstances, setPrivateInstances] = useState<Record<string, string>>({});

  useEffect(() => {
    api.fetchPrivateInstances().then(setPrivateInstances);
  }, []);

  // Mirrors can_access_conversation: a private number belongs to its owner
  // only; otherwise admins see all and everyone else needs a grant.
  const canSeeInstance = (name: string) => {
    const owner = privateInstances[name];
    if (owner) return owner === user?.id;
    return isAdmin || (!!user && !!grantsByInstance.get(name)?.has(user.id));
  };

  // All WhatsApp numbers the operator might filter by: every connected instance
  // they can access (so a freshly-connected number shows up even before it has
  // any messages) unioned with any instance that already owns conversations
  // (already RLS-filtered; covers a number since disconnected).
  const instances = Array.from(new Set([
    ...connectedInstances.map(i => i.name).filter(canSeeInstance),
    ...conversations.map(c => c.instance).filter((i): i is string => !!i),
  ])).sort((a, b) => (labels[a] ?? a).localeCompare(labels[b] ?? b));

  // WhatsApp-style archive: the main queue hides archived conversations (they
  // live behind the "Arquivadas" row), but a search there still finds them.
  const inbox = conversations.filter(c => !c.isArchived);
  const archived = conversations.filter(c => c.isArchived);
  const viewBase = showArchived ? archived : inbox;
  const searchBase = showArchived || !searchQuery ? viewBase : conversations;

  // Status counts reflect the instance currently selected.
  const byInstance = (list: UIConversation[]) => instanceFilter === 'all'
    ? list
    : list.filter(c => c.instance === instanceFilter);
  const counts = buildCounts(byInstance(inbox), user?.id);
  const archivedCount = byInstance(archived).length;
  const filtered = applyFilter(searchBase, showArchived ? 'all' : activeFilter, searchQuery, instanceFilter, user?.id);

  return (
    <div className="w-[30%] min-w-[320px] max-w-[560px] border-r border-border flex flex-col bg-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          {showArchived ? (
            <button
              onClick={() => { setShowArchived(false); setSearchQuery(''); }}
              className="flex items-center gap-2 text-lg font-bold text-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Arquivadas
            </button>
          ) : (
            <h2 className="text-xl font-bold text-foreground">Conversas</h2>
          )}
          <button
            onClick={onNewConversation}
            title="Nova conversa"
            aria-label="Nova conversa"
            className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={showArchived ? 'Buscar nas arquivadas...' : 'Buscar...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 h-10 bg-muted border-0 rounded-lg text-sm text-foreground focus:ring-1 focus:ring-ring/50 outline-none placeholder:text-muted-foreground transition-all"
          />
        </div>

        {instances.length >= 1 && (
          <div className="relative mt-2">
            <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className="w-full pl-7 pr-6 h-8 bg-background border border-border rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todos os números ({viewBase.length})</option>
              {instances.map(inst => (
                <option key={inst} value={inst}>
                  {labels[inst] ?? inst} ({viewBase.filter(c => c.instance === inst).length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}

      </div>

      {/* Filters */}
      {!showArchived && (
        <div className="pt-2 flex-shrink-0">
          <ConversationFilters active={activeFilter} onChange={setActiveFilter} counts={counts} />
        </div>
      )}

      {/* Entrada para as arquivadas, como no WhatsApp */}
      {!showArchived && !searchQuery && archivedCount > 0 && (
        <button
          onClick={() => { setShowArchived(true); setSearchQuery(''); }}
          className="mx-3 mb-2 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground/80 hover:bg-muted transition-colors flex-shrink-0"
        >
          <Archive className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">Arquivadas</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-medium">{archivedCount}</span>
        </button>
      )}


      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Sincronizando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground">
              {searchQuery || (!showArchived && activeFilter !== 'all') || instanceFilter !== 'all'
                ? 'Nenhuma conversa encontrada'
                : showArchived ? 'Nenhuma conversa arquivada' : 'Aguardando conversas'}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onClick={() => onSelect(conv.id)}
              sdrName={sdrName}
              teamMembers={teamMembers}
              onMarkAsUnread={onMarkAsUnread && (() => onMarkAsUnread(conv.id))}
              onMarkAsRead={onMarkAsRead && (() => onMarkAsRead(conv.id))}
              onToggleArchived={onSetArchived && (() => onSetArchived(conv.id, !conv.isArchived))}
              showArchivedBadge={!showArchived}
              taskBadge={taskBadgeByContact?.get(conv.contactId)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export { ConversationQueue };
