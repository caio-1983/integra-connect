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
  conversations,
  selectedId,
  onSelect,
  loading,
  sdrName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');

  const filtered = applyFilter(conversations, activeFilter, searchQuery);
  const counts = buildCounts(conversations);

  return (
    <div className="w-64 xl:w-72 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-md flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Fila Operacional</h2>
          <button
            disabled
            title="Em breve: Nova conversa"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 cursor-not-allowed opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none placeholder:text-slate-600 transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="pt-2 flex-shrink-0">
        <ConversationFilters
          active={activeFilter}
          onChange={setActiveFilter}
          counts={counts}
        />
      </div>

      {/* Total count */}
      <div className="px-4 pb-2 flex-shrink-0">
        <p className="text-[10px] text-slate-600">
          {filtered.length} conversa{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            <span className="text-xs text-slate-500">Sincronizando...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-3" />
            <p className="text-xs text-slate-500">
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
