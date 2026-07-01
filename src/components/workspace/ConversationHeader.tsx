import React from 'react';
import { Bot, User, Pause } from 'lucide-react';
import { UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { WorkspaceActions } from './WorkspaceActions';

interface ConversationHeaderProps {
  conversation: UIConversation;
  sdrName: string;
  showCustomerPanel: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onToggleCustomerPanel: () => void;
}

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
  human:  { icon: User,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { icon: Pause, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation, sdrName, showCustomerPanel, onStatusChange, onToggleCustomerPanel,
}) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel =
    conversation.status === 'nina' ? sdrName :
    conversation.status === 'human' ? 'Humano' : 'Pausado';

  return (
    <div className="h-14 px-4 flex items-center justify-between bg-card border-b border-border shrink-0 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-8 h-8 rounded-full ring-2 ring-border"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground truncate">{conversation.contactName}</h2>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-primary font-medium truncate">{conversation.contactPhone}</p>
        </div>
      </div>

      <WorkspaceActions
        status={conversation.status}
        sdrName={sdrName}
        showCustomerPanel={showCustomerPanel}
        onStatusChange={onStatusChange}
        onToggleCustomerPanel={onToggleCustomerPanel}
      />
    </div>
  );
};

export { ConversationHeader };
