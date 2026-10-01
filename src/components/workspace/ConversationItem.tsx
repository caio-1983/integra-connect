import React from 'react';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { Bot, User, Pause, ChevronDown, MailX, MailOpen, Archive, ArchiveRestore, Clock, SquareCheck, Pin, PinOff } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageType, UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { AttendantTag } from './AttendantTag';
import { CampaignBadge } from './CampaignBadge';
import type { LeadCampaign } from '@/services/attributionService';
import { messagePreview, previewIcon, stripMediaEmoji } from './ConversationTimeline';

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
  /** Pinned to the top by the logged-in attendant — pin icon on the row. */
  isPinned?: boolean;
  onTogglePinned?: () => void;
  /** Shows an "Arquivada" chip — used when archived rows appear in a search. */
  showArchivedBadge?: boolean;
  /** The logged-in attendant's most urgent pending task for this contact. */
  taskBadge?: { kind: 'late' | 'today' | 'later' | 'none'; label: string };
  /** Campaign the lead came from — automatic origin badge, not a tag. */
  campaign?: LeadCampaign;
}

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-primary-subtle text-primary-subtle-foreground' },
  human:  { icon: User,  color: 'bg-secondary text-muted-foreground' },
  paused: { icon: Pause, color: 'bg-warning-subtle text-warning' },
};

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, isSelected, onClick, sdrName, teamMembers = [], onMarkAsUnread, onMarkAsRead, onToggleArchived, isPinned, onTogglePinned, showArchivedBadge, taskBadge, campaign }) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel = conversation.status === 'nina' ? sdrName : conversation.status === 'human' ? 'Humano' : 'Pausado';
  const channelCfg = CHANNEL_CONFIG[conversation.primaryChannel];
  const ChannelIcon = channelCfg.icon;

  const lastMsg = conversation.messages[conversation.messages.length - 1];
  const lastMsgType = lastMsg?.type;
  const lastMsgPreview =
    lastMsg?.pix || lastMsgType === MessageType.IMAGE || lastMsgType === MessageType.AUDIO ? messagePreview(lastMsg) :
    stripMediaEmoji(conversation.lastMessage || '') || 'Sem mensagens';
  const PreviewIcon = previewIcon(lastMsg, conversation.lastMessage);

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
        isSelected ? 'bg-secondary' : 'hover:bg-accent',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <ContactAvatar src={conversation.contactAvatar} name={conversation.contactName} className="w-[49px] h-[49px] text-lg" />
        {showChannel && (
          <span
            title={channelCfg.label}
            className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-card flex items-center justify-center bg-card', channelCfg.color)}
          >
            <ChannelIcon className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Content — fixed two lines like WhatsApp; a third only for owner/tags. */}
      <div className="flex-1 min-w-0 py-3 border-b border-border flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[17px] leading-[21px] text-foreground truncate">{conversation.contactName}</span>
          <span className={cn('text-xs flex-shrink-0 tabular-nums', isUnread ? 'text-primary font-medium' : 'text-muted-foreground')}>
            {conversation.lastMessageTime}
          </span>
        </div>

        <div className="flex items-center gap-1.5 min-w-0 transition-[padding] group-hover:pr-6 group-focus-within:pr-6 group-has-[[data-state=open]]:pr-6">
          {isWaiting && (
            <span title="O cliente falou por último e ainda não teve resposta" className="flex-shrink-0 flex items-center gap-0.5 text-xs font-semibold text-warning">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Aguardando resposta</span>
            </span>
          )}
          {taskBadge && (
            <span
              title="Você tem uma tarefa neste contato"
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-0.5 h-[18px] px-1.5 rounded-full text-[11px] font-bold',
                taskBadge.kind === 'late' && 'bg-danger-subtle text-danger',
                taskBadge.kind === 'today' && 'bg-primary-subtle text-primary-subtle-foreground',
                (taskBadge.kind === 'later' || taskBadge.kind === 'none') && 'bg-secondary text-muted-foreground',
              )}
            >
              <SquareCheck className="w-3 h-3" />{taskBadge.label}
            </span>
          )}
          {showStatus && (
            <span title={statusLabel} className={cn('flex-shrink-0 px-1.5 h-[18px] rounded-full text-[11px] font-medium flex items-center gap-0.5', color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusLabel}
            </span>
          )}
          {PreviewIcon && <PreviewIcon className="w-4 h-4 text-icon flex-shrink-0" aria-hidden="true" />}
          <span className="flex-1 min-w-0 text-sm text-muted-foreground truncate">{lastMsgPreview}</span>
          {isPinned && (
            <span title="Conversa fixada" className="flex-shrink-0">
              <Pin className="w-4 h-4 text-icon rotate-45" aria-hidden="true" />
              <span className="sr-only">Fixada</span>
            </span>
          )}
          {isUnread && (
            <span className="flex-shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full tabular-nums" aria-label={`${conversation.unreadCount} mensagens não lidas`}>
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
              <span className="px-1.5 h-[18px] bg-secondary text-muted-foreground text-[11px] rounded-full flex items-center gap-1 flex-shrink-0">
                <Archive className="w-2.5 h-2.5" /> Arquivada
              </span>
            )}
            {/* Origin badge: computed from attribution, so it looks different
                from the editable tags next to it. */}
            {campaign && <CampaignBadge campaign={campaign} className="max-w-[140px]" />}
            {conversation.tags.slice(0, 1).map(tag => (
              <span key={tag} className="px-1.5 h-[18px] leading-[18px] bg-secondary text-muted-foreground text-[11px] rounded-full truncate max-w-[80px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>

    {/* Menu da conversa (como o chevron do WhatsApp) — aparece no hover. */}
    {(onMarkAsUnread || onMarkAsRead || onToggleArchived || onTogglePinned) && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Opções da conversa"
            aria-label="Opções da conversa"
            className="absolute right-3 top-[35px] w-6 h-6 flex items-center justify-center text-icon hover:text-foreground opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 focus-visible:opacity-100 focus-visible:translate-x-0 data-[state=open]:opacity-100 data-[state=open]:translate-x-0 transition-all"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {isUnread ? (
            <DropdownMenuItem className="gap-3" onSelect={() => onMarkAsRead?.()}>
              <MailOpen className="h-[18px] w-[18px] text-icon" /> Marcar como lida
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="gap-3" onSelect={() => onMarkAsUnread?.()}>
              <MailX className="h-[18px] w-[18px] text-icon" /> Marcar como não lida
            </DropdownMenuItem>
          )}
          {onTogglePinned && (
            <DropdownMenuItem className="gap-3" onSelect={() => onTogglePinned()}>
              {isPinned ? (
                <><PinOff className="h-[18px] w-[18px] text-icon" /> Desafixar conversa</>
              ) : (
                <><Pin className="h-[18px] w-[18px] text-icon" /> Fixar conversa</>
              )}
            </DropdownMenuItem>
          )}
          {onToggleArchived && (
            <DropdownMenuItem className="gap-3" onSelect={() => onToggleArchived()}>
              {conversation.isArchived ? (
                <><ArchiveRestore className="h-[18px] w-[18px] text-icon" /> Desarquivar conversa</>
              ) : (
                <><Archive className="h-[18px] w-[18px] text-icon" /> Arquivar conversa</>
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
