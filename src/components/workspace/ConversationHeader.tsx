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
  nina:   { icon: Bot,   color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  human:  { icon: User,  color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  paused: { icon: Pause, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
};

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  sdrName,
  showCustomerPanel,
  onStatusChange,
  onToggleCustomerPanel,
}) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel =
    conversation.status === 'nina' ? sdrName :
    conversation.status === 'human' ? 'Humano' : 'Pausado';

  return (
    <div className="h-14 px-4 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shrink-0 gap-4">
      {/* Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <img
            src={conversation.contactAvatar}
            alt={conversation.contactName}
            className="w-8 h-8 rounded-full ring-2 ring-slate-800"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-100 truncate">{conversation.contactName}</h2>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-cyan-500/80 font-medium truncate">{conversation.contactPhone}</p>
        </div>
      </div>

      {/* Actions */}
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
