import React from 'react';
import { MoreVertical, Bot, User, Pause, Info } from 'lucide-react';
import { UIConversation, ConversationStatus } from '@/types';
import { Button } from '@/components/Button';

interface ConversationHeaderProps {
  activeChat: UIConversation;
  sdrName: string;
  showProfileInfo: boolean;
  onToggleProfile: () => void;
  onStatusChange: (status: ConversationStatus) => void;
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

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  activeChat,
  sdrName,
  showProfileInfo,
  onToggleProfile,
  onStatusChange,
}) => {
  return (
    <div className="h-16 px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10 shrink-0">
      <div
        className="flex items-center cursor-pointer hover:bg-slate-800/50 p-1.5 -ml-1.5 rounded-lg transition-colors pr-3"
        onClick={onToggleProfile}
      >
        <div className="relative">
          <img
            src={activeChat.contactAvatar}
            alt={activeChat.contactName}
            className="w-9 h-9 rounded-full ring-2 ring-slate-800"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        </div>
        <div className="ml-3">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            {activeChat.contactName}
            {renderStatusBadge(activeChat.status, sdrName)}
          </h2>
          <p className="text-xs text-cyan-500 font-medium">{activeChat.contactPhone}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`text-slate-400 hover:text-white ${activeChat.status === 'nina' ? 'bg-violet-500/20 text-violet-400' : ''}`}
          onClick={() => onStatusChange('nina')}
          title={`Ativar ${sdrName} (IA)`}
        >
          <Bot className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`text-slate-400 hover:text-white ${activeChat.status === 'human' ? 'bg-emerald-500/20 text-emerald-400' : ''}`}
          onClick={() => onStatusChange('human')}
          title="Assumir conversa"
        >
          <User className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`text-slate-400 hover:text-white ${activeChat.status === 'paused' ? 'bg-amber-500/20 text-amber-400' : ''}`}
          onClick={() => onStatusChange('paused')}
          title="Pausar conversa"
        >
          <Pause className="w-5 h-5" />
        </Button>
        <div className="h-6 w-px bg-slate-800 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className={`text-slate-400 hover:text-white ${showProfileInfo ? 'bg-slate-800 text-cyan-400' : ''}`}
          onClick={onToggleProfile}
          title="Ver Informações"
        >
          <Info className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled
          title="Em breve: Mais opções"
          className="text-slate-500 cursor-not-allowed opacity-50"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ConversationHeader;
