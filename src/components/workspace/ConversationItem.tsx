import React from 'react';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { Bot, User, Pause, ChevronDown, MailX, MailOpen, Archive, ArchiveRestore, Clock, SquareCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageType, UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { AttendantTag } from './AttendantTag';
import { CampaignBadge } from './CampaignBadge';
import type { LeadCampaign } from '@/services/attributionService';
import { messagePreview } from './ConversationTimeline';

interface ConversationItemProps {
  conversation: UIConversation;
  isSelected: boolean;
  onClick: () => void;
  sdrName: string;
  /** Needed to name the assigned attendant on the queue row. */
  teamMembers?: Array<{ id: string; name: string; user_id?: string | null }>;
  onMarkAsUnread?: () => void;
  onMarkAsRead?: () => void;
  onToggleArchived?: () => void;
  /** Shows an "Arquivada" chip — used when archived rows appear in a search. */
  showArchivedBadge?: boolean;
  /** The logged-in attendant's most urgent pending task for this contact. */
  taskBadge?: { kind: 'late' | 'today' | 'later' | 'none'; label: string };
  /** Campaign the lead came from — automatic origin badge, not a tag. */
  campaign?: LeadCampaign;
}

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
  human:  { icon: User,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { icon: Pause, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isSelected, onClick, sdrName, teamMembers = [], onMarkAsUnread, onMarkAsRead, onToggleArchived, showArchivedBadge, taskBadge, campaign }) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel = conversation.status === 'nina' ? sdrName : conversation.status === 'human' ? 'Humano' : 'Pausado';
  const channelCfg = CHANNEL_CONFIG[conversation.primaryChannel];
  const ChannelIcon = channelCfg.icon;

  const lastMsg = conversation.messages[conversation.messages.length - 1];
  const lastMsgType = lastMsg?.type;
  const lastMsgPreview =
    lastMsgType === MessageType.IMAGE ? messagePreview(lastMsg) :
    lastMsgType === MessageType.AUDIO ? '🎵 Áudio' :
    conversation.lastMessage || 'Sem mensagens';

  const isUnread = conversation.unreadCount > 0;
  // Labels only for the exceptions: human handling is the default today, and
  // almost every conversation is WhatsApp — repeating either on every row is noise.
  const showStatus = conversation.status !== 'human';
  const showChannel = conversation.primaryChannel !== 'whatsapp';
  const isWaiting = !!lastMsg && lastMsg.fromType === 'user';

  return (
    <div className="relative group">
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 pl-3 pr-3 text-left transition-colors',
        isSelected ? 'bg-muted' : 'hover:bg-muted/50',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <ContactAvatar src={conversation.contactAvatar} name={conversation.contactName} className="w-12 h-12 text-lg" />
        {showChannel && (
          <span
            title={channelCfg.label}
            className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border flex items-center justify-center bg-background', channelCfg.color)}
          >
            <ChannelIcon className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Content — fixed two lines like WhatsApp; a third only for owner/tags. */}
      <div className="flex-1 min-w-0 py-3 border-b border-border/60 flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] text-foreground truncate">{conversation.contactName}</span>
          <span className={cn('text-xs flex-shrink-0', isUnread ? 'text-[#008069] dark:text-[#00a884] font-semibold' : 'text-muted-foreground')}>
            {conversation.lastMessageTime}
          </span>
        </div>

        <div className="flex items-center gap-1.5 min-w-0 transition-[padding] group-hover:pr-6 group-focus-within:pr-6 group-has-[[data-state=open]]:pr-6">
          {isWaiting && (
            <span title="O cliente falou por último e ainda não teve resposta" className="flex-shrink-0 flex items-center gap-0.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </span>
          )}
          {taskBadge && (
            <span
              title="Você tem uma tarefa neste contato"
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-0.5 h-[18px] px-1.5 rounded-full text-[11px] font-bold',
                taskBadge.kind === 'late' && 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
                taskBadge.kind === 'today' && 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
                (taskBadge.kind === 'later' || taskBadge.kind === 'none') && 'bg-muted text-muted-foreground',
              )}
            >
              <SquareCheck className="w-3 h-3" />{taskBadge.label}
            </span>
          )}
          {showStatus && (
            <span title={statusLabel} className={cn('flex-shrink-0 px-1 py-px rounded text-[10px] font-semibold border flex items-center gap-0.5', color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusLabel}
            </span>
          )}
          <span className="flex-1 min-w-0 text-[13.5px] text-muted-foreground truncate">{lastMsgPreview}</span>
          {isUnread && (
            <span className="flex-shrink-0 bg-[#008069] dark:bg-[#00a884] text-white dark:text-[#111b21] text-[11px] font-bold px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full">
              {conversation.unreadCount}
            </span>
          )}
        </div>

        {(conversation.assignedUserId || campaign || conversation.tags.length > 0 || (showArchivedBadge && conversation.isArchived)) && (
          <div className="flex items-center gap-1.5 mt-1">
            {/* Para quem a conversa foi direcionada — vem antes das tags porque é a
                informação que o gestor procura ao varrer a fila. */}
            <AttendantTag assignedUserId={conversation.assignedUserId} teamMembers={teamMembers} compact />
            {showArchivedBadge && conversation.isArchived && (
              <span className="px-1.5 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded font-medium flex items-center gap-1 flex-shrink-0">
                <Archive className="w-2.5 h-2.5" /> Arquivada
              </span>
            )}
            {/* Origin badge: computed from attribution, so it looks different
                from the editable tags next to it. */}
            {campaign && <CampaignBadge campaign={campaign} className="max-w-[140px]" />}
            {conversation.tags.slice(0, 1).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-muted border border-border text-muted-foreground text-[10px] rounded font-medium truncate max-w-[80px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>

    {/* Menu da conversa (como o chevron do WhatsApp) — aparece no hover. */}
    {(onMarkAsUnread || onMarkAsRead || onToggleArchived) && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Opções da conversa"
            aria-label="Opções da conversa"
            className="absolute right-3 top-[35px] w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 data-[state=open]:opacity-100 data-[state=open]:translate-x-0 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5">
          {isUnread ? (
            <DropdownMenuItem className="gap-3 py-2.5 px-3 text-sm rounded-lg" onSelect={() => onMarkAsRead?.()}>
              <MailOpen className="h-[18px] w-[18px] text-muted-foreground" /> Marcar como lida
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="gap-3 py-2.5 px-3 text-sm rounded-lg" onSelect={() => onMarkAsUnread?.()}>
              <MailX className="h-[18px] w-[18px] text-muted-foreground" /> Marcar como não lida
            </DropdownMenuItem>
          )}
          {onToggleArchived && (
            <DropdownMenuItem className="gap-3 py-2.5 px-3 text-sm rounded-lg" onSelect={() => onToggleArchived()}>
              {conversation.isArchived ? (
                <><ArchiveRestore className="h-[18px] w-[18px] text-muted-foreground" /> Desarquivar conversa</>
              ) : (
                <><Archive className="h-[18px] w-[18px] text-muted-foreground" /> Arquivar conversa</>
              )}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )}
    </div>
  );
};

export { ConversationItem };
