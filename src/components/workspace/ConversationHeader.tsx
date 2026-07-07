import React, { useState } from 'react';
import { Bot, User, Pause, MessageSquarePlus } from 'lucide-react';
import { UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { WorkspaceActions } from './WorkspaceActions';
import { GroupParticipantsModal } from './GroupParticipantsModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/Button';
import { MOCK_PLAYGROUND_PRESETS } from '@/lib/mockAIData';

interface ConversationHeaderProps {
  conversation: UIConversation;
  sdrName: string;
  showCustomerPanel: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onToggleCustomerPanel: () => void;
  onSimulateCustomerMessage?: (content: string) => void;
  teamMembers: Array<{ id: string; name: string }>;
  onTransfer: (userId: string) => void;
}

const SimulateCustomerMessagePopover: React.FC<{ onSimulate: (content: string) => void }> = ({ onSimulate }) => {
  const [open, setOpen] = useState(false);
  const [freeText, setFreeText] = useState('');

  const handlePreset = (text: string) => {
    onSimulate(text);
    setOpen(false);
  };

  const handleFreeText = () => {
    if (!freeText.trim()) return;
    onSimulate(freeText.trim());
    setFreeText('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Simular mensagem do cliente"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider">Simular mensagem do cliente</p>
        <div className="flex flex-col gap-1.5">
          {MOCK_PLAYGROUND_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFreeText()}
            placeholder="Ou digite uma mensagem livre..."
            className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <Button size="sm" variant="primary" onClick={handleFreeText}>Enviar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
  human:  { icon: User,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { icon: Pause, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation, sdrName, showCustomerPanel, onStatusChange, onToggleCustomerPanel, onSimulateCustomerMessage,
  teamMembers, onTransfer,
}) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel =
    conversation.status === 'nina' ? sdrName :
    conversation.status === 'human' ? 'Humano' : 'Pausado';
  const channelCfg = CHANNEL_CONFIG[conversation.primaryChannel];
  const ChannelIcon = channelCfg.icon;
  const isGroup = conversation.contactPhone.endsWith('@g.us');
  const [participantsOpen, setParticipantsOpen] = useState(false);

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
        <div className="min-w-0 flex-1">
          {isGroup ? (
            <h2
              onClick={() => setParticipantsOpen(true)}
              title="Ver participantes do grupo"
              className="text-sm font-bold text-foreground truncate cursor-pointer hover:underline"
            >
              {conversation.contactName}
            </h2>
          ) : (
            <h2 className="text-sm font-bold text-foreground truncate">{conversation.contactName}</h2>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', color)}>
              <StatusIcon className="w-2.5 h-2.5" />
              {statusLabel}
            </span>
            <span
              title={channelCfg.label}
              className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 flex-shrink-0', channelCfg.color)}
            >
              <ChannelIcon className="w-2.5 h-2.5" />
              {channelCfg.label}
            </span>
            <span className="text-xs text-primary font-medium truncate">
              {isGroup ? 'Grupo do WhatsApp' : conversation.contactPhone}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {conversation.status === 'nina' && onSimulateCustomerMessage && (
          <SimulateCustomerMessagePopover onSimulate={onSimulateCustomerMessage} />
        )}
        <WorkspaceActions
          status={conversation.status}
          sdrName={sdrName}
          showCustomerPanel={showCustomerPanel}
          onStatusChange={onStatusChange}
          onToggleCustomerPanel={onToggleCustomerPanel}
          teamMembers={teamMembers}
          assignedUserId={conversation.assignedUserId}
          onTransfer={onTransfer}
        />
      </div>

      {isGroup && (
        <GroupParticipantsModal
          conversationId={conversation.id}
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
        />
      )}
    </div>
  );
};

export { ConversationHeader };
