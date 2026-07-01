import React, { useState } from 'react';
import { Search, Plus, Loader2, MessageSquare } from 'lucide-react';
import { UIConversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { ConversationFilters, QueueFilter } from './ConversationFilters';
import { cn } from '@/lib/utils';

interface ConversationQueueProps {
  conversations: UIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  sdrName: string;
}

function applyFilter(conversations: UIConversation[], filter: QueueFilter, query: string): UIConversation[] {
  let result = conversations;
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
  conversations, selectedId, onSelect, loading, sdrName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');

  const filtered = applyFilter(conversations, activeFilter, searchQuery);
  const counts = buildCounts(conversations);

  return (
    <div className="w-64 xl:w-72 border-r border-border flex flex-col bg-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Fila Operacional</h2>
          <button
            disabled
            title="Em breve: Nova conversa"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/40 cursor-not-allowed opacity-50"
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
