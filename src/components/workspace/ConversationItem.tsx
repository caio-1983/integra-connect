import React from 'react';
import { Bot, User, Pause } from 'lucide-react';
import { MessageType, UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';

interface ConversationItemProps {
  conversation: UIConversation;
  isSelected: boolean;
  onClick: () => void;
  sdrName: string;
}

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
  human:  { icon: User,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { icon: Pause, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isSelected, onClick, sdrName }) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel = conversation.status === 'nina' ? sdrName : conversation.status === 'human' ? 'Humano' : 'Pausado';
  const channelCfg = CHANNEL_CONFIG[conversation.primaryChannel];
  const ChannelIcon = channelCfg.icon;

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
        'border-b border-border/40 border-l-2 hover:bg-muted/50',
        isSelected ? 'bg-muted/60 border-l-primary' : 'border-l-transparent',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-slate-200 to-slate-100">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-full h-full rounded-full object-cover border border-border"
          />
        </div>
        <span
          title={channelCfg.label}
          className={cn('absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center bg-background', channelCfg.color)}
        >
          <ChannelIcon className="w-2 h-2" />
        </span>
        {conversation.unreadCount > 0 ? (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full animate-pulse" />
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-muted-foreground/30 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5 gap-1">
          <span className={cn('text-xs font-semibold truncate', isSelected ? 'text-foreground' : 'text-foreground/80')}>
            {conversation.contactName}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">{conversation.lastMessageTime}</span>
        </div>

        <p className="text-[11px] text-muted-foreground truncate mb-1.5">{lastMsgPreview}</p>

        <div className="flex items-center gap-1.5">
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', color)}>
            <StatusIcon className="w-2.5 h-2.5" />
            {statusLabel}
          </span>
          {conversation.tags.slice(0, 1).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded font-medium truncate max-w-[60px]">
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
