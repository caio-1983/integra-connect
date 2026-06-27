import React, { useState } from 'react';
import { Search, MessageSquare, Bot, User, Pause } from 'lucide-react';
import { UIConversation, ConversationStatus, MessageType } from '@/types';

interface ConversationListProps {
  conversations: UIConversation[];
  selectedChatId: string | null;
  sdrName: string;
  onSelectChat: (id: string) => void;
}

const renderStatusBadge = (status: ConversationStatus, sdrName: string) => {
  const config = {
    nina: { label: sdrName, icon: Bot, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    human: { label: 'Humano', icon: User, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    paused: { label: 'Pausado', icon: Pause, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };
  const { label, icon: Icon, color } = config[status];
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
};

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedChatId,
  sdrName,
  onSelectChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter(chat => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      chat.contactName.toLowerCase().includes(q) ||
      chat.contactPhone.includes(q) ||
      chat.lastMessage.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-md z-20 flex-shrink-0">
      <div className="p-4 border-b border-slate-800/50">
        <h2 className="text-lg font-bold text-white mb-4 px-1">Chats Ativos</h2>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-slate-200 placeholder:text-slate-600 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
            <p className="text-xs mt-1 opacity-70">As conversas aparecerão aqui quando receberem mensagens</p>
          </div>
        ) : (
          filtered.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`flex items-center p-4 cursor-pointer transition-all duration-200 border-b border-slate-800/30 hover:bg-slate-800/50 ${
                selectedChatId === chat.id
                  ? 'bg-slate-800/80 border-l-2 border-l-cyan-500'
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-slate-700 to-slate-900">
                  <img
                    src={chat.contactAvatar}
                    alt={chat.contactName}
                    className="w-full h-full rounded-full object-cover border border-slate-800"
                  />
                </div>
                {chat.unreadCount > 0 ? (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-cyan-500 border-2 border-slate-900 rounded-full animate-pulse" />
                ) : (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-600 border-2 border-slate-900 rounded-full" />
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm font-semibold truncate ${selectedChatId === chat.id ? 'text-white' : 'text-slate-300'}`}>
                    {chat.contactName}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">{chat.lastMessageTime}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {chat.messages[chat.messages.length - 1]?.type === MessageType.IMAGE ? '📷 Imagem' :
                   chat.messages[chat.messages.length - 1]?.type === MessageType.AUDIO ? '🎵 Áudio' :
                   chat.lastMessage || 'Sem mensagens'}
                </p>
                <div className="flex items-center mt-2 gap-1.5">
                  {renderStatusBadge(chat.status, sdrName)}
                  {chat.tags.slice(0, 1).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] rounded-md font-medium">
                      {tag}
                    </span>
                  ))}
                  {chat.unreadCount > 0 && (
                    <span className="ml-auto bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[10px] font-bold px-1.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full shadow-lg shadow-cyan-500/20">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
