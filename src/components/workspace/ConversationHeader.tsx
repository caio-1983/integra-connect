import React, { useState } from 'react';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { ArrowLeft, Bot, User, Pause, MessageSquarePlus } from 'lucide-react';
import { UIConversation, ConversationStatus } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { WorkspaceActions } from './WorkspaceActions';
import { GroupParticipantsModal } from './GroupParticipantsModal';
import { AttendantTag } from './AttendantTag';
import { CampaignBadge } from './CampaignBadge';
import { useLeadCampaigns } from '@/hooks/useLeadCampaigns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/Button';
import { MOCK_PLAYGROUND_PRESETS } from '@/lib/mockAIData';
import { isModuleEnabled } from '@/lib/platformPhase';

interface ConversationHeaderProps {
  conversation: UIConversation;
  sdrName: string;
  showCustomerPanel: boolean;
  onToggleCustomerPanel: () => void;
  onSimulateCustomerMessage?: (content: string) => void;
  /** `user_id` is the auth id; AttendantTag matches assigned_user_id against it. */
  teamMembers: Array<{ id: string; name: string; user_id?: string | null }>;
  onTransfer: (userId: string) => void;
  /** Troca ou remove (null) o atendente pela própria tag. */
  onChangeAttendant: (teamMemberId: string | null) => void;
  onMarkAsUnread: (conversationId: string) => void;
  /** Celular: volta para a lista de conversas. */
  onBack?: () => void;
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-icon hover:bg-accent transition-colors"
        >
          <MessageSquarePlus className="w-5 h-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <p className="text-sm font-medium text-foreground">Simular mensagem do cliente</p>
        <div className="flex flex-col gap-1.5">
          {MOCK_PLAYGROUND_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              className="text-left text-sm px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-foreground transition-colors"
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
            className="h-9 flex-1 rounded-full border-0 bg-secondary px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
          <Button size="sm" variant="primary" onClick={handleFreeText}>Enviar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const STATUS_CONFIG: Record<ConversationStatus, { icon: React.ElementType; color: string }> = {
  nina:   { icon: Bot,   color: 'bg-primary-subtle text-primary-subtle-foreground' },
  human:  { icon: User,  color: 'bg-card text-muted-foreground' },
  paused: { icon: Pause, color: 'bg-warning-subtle text-warning' },
};

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation, sdrName, showCustomerPanel, onToggleCustomerPanel, onSimulateCustomerMessage,
  teamMembers, onTransfer, onChangeAttendant, onMarkAsUnread, onBack,
}) => {
  const { icon: StatusIcon, color } = STATUS_CONFIG[conversation.status];
  const statusLabel =
    conversation.status === 'nina' ? sdrName :
    conversation.status === 'human' ? 'Lu pausada · atendimento humano' : 'Pausado';
  const channelCfg = CHANNEL_CONFIG[conversation.primaryChannel];
  const ChannelIcon = channelCfg.icon;
  const isGroup = conversation.contactPhone.endsWith('@g.us');
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const campaign = useLeadCampaigns([conversation.contactId]).get(conversation.contactId);

  return (
    <div className="h-[60px] px-2 md:px-4 flex items-center justify-between bg-muted shrink-0 gap-2 md:gap-4">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para as conversas"
            className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-icon hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-shrink-0">
          <ContactAvatar zoomable src={conversation.contactAvatar} name={conversation.contactName} className="w-10 h-10 text-sm" />
        </div>
        <div className="min-w-0 flex-1">
          {isGroup ? (
            <h2
              onClick={() => setParticipantsOpen(true)}
              title="Ver participantes do grupo"
              className="text-base text-foreground truncate cursor-pointer hover:underline"
            >
              {conversation.contactName}
            </h2>
          ) : (
            <h2 className="text-base text-foreground truncate">{conversation.contactName}</h2>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
            <span title={statusLabel} className={cn('px-1.5 h-[18px] min-w-0 max-w-full rounded-full text-[11px] font-medium flex items-center gap-1', color)}>
              <StatusIcon className="w-2.5 h-2.5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{statusLabel}</span>
            </span>
            {conversation.primaryChannel !== 'whatsapp' && (
            <span
              title={channelCfg.label}
              className={cn('px-1.5 h-[18px] rounded-full text-[11px] font-medium border flex items-center gap-1 flex-shrink-0', channelCfg.color)}
            >
              <ChannelIcon className="w-2.5 h-2.5" aria-hidden="true" />
              {channelCfg.label}
            </span>
            )}
            {/* The details panel shows the number too — it gives way first when the header is tight. */}
            <span className="hidden 2xl:inline text-[13px] text-muted-foreground truncate tabular-nums">
              {isGroup ? 'Grupo do WhatsApp' : conversation.contactPhone}
            </span>
            {campaign && <CampaignBadge campaign={campaign} className="hidden md:inline-flex max-w-[220px] flex-shrink" />}
            {/* Para quem esta conversa foi direcionada — derivado de
                assigned_user_id, não de conversations.tags (ver AttendantTag). */}
            <AttendantTag
              assignedUserId={conversation.assignedUserId}
              teamMembers={teamMembers}
              onChange={onChangeAttendant}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Ferramenta de teste do módulo de IA: injeta uma mensagem falsa do
            cliente e dispara o agente, o que também pode gravar mudança de
            status na conversa real. Só aparece onde o módulo 'ia' está ligado
            (fase 2) — na fase 1 um atendente veria um botão que sujaria uma
            conversa de verdade. */}
        {isModuleEnabled('ia') && conversation.status === 'nina' && onSimulateCustomerMessage && (
          <SimulateCustomerMessagePopover onSimulate={onSimulateCustomerMessage} />
        )}
        <WorkspaceActions
          showCustomerPanel={showCustomerPanel}
          onToggleCustomerPanel={onToggleCustomerPanel}
          teamMembers={teamMembers}
          assignedUserId={conversation.assignedUserId}
          onTransfer={onTransfer}
          onMarkAsUnread={() => onMarkAsUnread(conversation.id)}
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
