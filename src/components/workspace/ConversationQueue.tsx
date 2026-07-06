import React, { useState } from 'react';
import { Search, Plus, Loader2, MessageSquare, Smartphone, ChevronDown } from 'lucide-react';
import { UIConversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { ConversationFilters, QueueFilter } from './ConversationFilters';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { cn } from '@/lib/utils';

interface ConversationQueueProps {
  conversations: UIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  sdrName: string;
  onNewConversation: () => void;
}

function applyFilter(conversations: UIConversation[], filter: QueueFilter, query: string, instance: string): UIConversation[] {
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
    case 'nina':   return result.filter(c => c.status === 'nina');
    case 'human':  return result.filter(c => c.status === 'human');
    case 'paused': return result.filter(c => c.status === 'paused');
    default:       return result;
  }
}

function buildCounts(conversations: UIConversation[]): Record<QueueFilter, number> {
  return {
    all:    conversations.length,
    unread: conversations.filter(c => c.unreadCount > 0).length,
    nina:   conversations.filter(c => c.status === 'nina').length,
    human:  conversations.filter(c => c.status === 'human').length,
    paused: conversations.filter(c => c.status === 'paused').length,
  };
}

const ConversationQueue: React.FC<ConversationQueueProps> = ({
  conversations, selectedId, onSelect, loading, sdrName, onNewConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');
  const [instanceFilter, setInstanceFilter] = useState('all');
  const { instances: connectedInstances } = useWhatsappInstances();

  // All WhatsApp numbers the operator might filter by: every connected instance
  // (so a freshly-connected number shows up even before it has any messages)
  // unioned with any instance that already owns conversations (covers a number
  // that was since disconnected but still has history in the queue).
  const instances = Array.from(new Set([
    ...connectedInstances.map(i => i.name),
    ...conversations.map(c => c.instance).filter((i): i is string => !!i),
  ])).sort();

  // Status counts reflect the instance currently selected.
  const instanceScoped = instanceFilter === 'all'
    ? conversations
    : conversations.filter(c => c.instance === instanceFilter);
  const counts = buildCounts(instanceScoped);
  const filtered = applyFilter(conversations, activeFilter, searchQuery, instanceFilter);

  return (
    <div className="w-64 xl:w-72 border-r border-border flex flex-col bg-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Conversas</h2>
          <button
            onClick={onNewConversation}
            title="Nova conversa"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none placeholder:text-muted-foreground transition-all"
          />
        </div>

        {instances.length >= 1 && (
          <div className="relative mt-2">
            <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <select
              value={instanceFilter}
              onChange={(e) => setInstanceFilter(e.target.value)}
              className="w-full pl-7 pr-6 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">Todas as instâncias ({conversations.length})</option>
              {instances.map(inst => (
                <option key={inst} value={inst}>
                  {inst} ({conversations.filter(c => c.instance === inst).length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="pt-2 flex-shrink-0">
        <ConversationFilters active={activeFilter} onChange={setActiveFilter} counts={counts} />
      </div>

      {/* Count */}
      <div className="px-4 pb-2 flex-shrink-0">
        <p className="text-[10px] text-muted-foreground/60">
          {filtered.length} conversa{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

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
              {searchQuery || activeFilter !== 'all'
                ? 'Nenhuma conversa encontrada'
                : 'Aguardando conversas'}
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
            />
          ))
        )}
      </div>
    </div>
  );
};

export { ConversationQueue };
