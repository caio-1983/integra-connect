import React from 'react';
import { Bot, User, Pause } from 'lucide-react';
import { MessageType, UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: UIConversation;
  isSelected: boolean;
  onClick: () => void;
  sdrName: string;
}

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  human:  { icon: User,  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  paused: { icon: Pause, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isSelected, onClick, sdrName }) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel = conversation.status === 'nina' ? sdrName : conversation.status === 'human' ? 'Humano' : 'Pausado';

  const lastMsgType = conversation.messages[conversation.messages.length - 1]?.type;
  const lastMsgPreview =
    lastMsgType === MessageType.IMAGE ? '📷 Imagem' :
    lastMsgType === MessageType.AUDIO ? '🎵 Áudio' :
    conversation.lastMessage || 'Sem mensagens';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3.5 text-left transition-all duration-150',
        'border-b border-slate-800/40 border-l-2 hover:bg-slate-800/40',
        isSelected ? 'bg-slate-800/60 border-l-cyan-500' : 'border-l-transparent',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-slate-700 to-slate-900">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-full h-full rounded-full object-cover border border-slate-800"
          />
        </div>
        {conversation.unreadCount > 0 ? (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-500 border-2 border-slate-900 rounded-full animate-pulse" />
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-slate-600 border-2 border-slate-900 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5 gap-1">
          <span className={cn('text-xs font-semibold truncate', isSelected ? 'text-white' : 'text-slate-300')}>
            {conversation.contactName}
          </span>
          <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">{conversation.lastMessageTime}</span>
        </div>

        <p className="text-[11px] text-slate-500 truncate mb-1.5">{lastMsgPreview}</p>

        <div className="flex items-center gap-1.5">
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', color)}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusLabel}
          </span>
          {conversation.tags.slice(0, 1).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] rounded font-medium truncate max-w-[60px]">
              {tag}
            </span>
          ))}
          {conversation.unreadCount > 0 && (
            <span className="ml-auto bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[10px] font-bold px-1.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full flex-shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export { ConversationItem };
