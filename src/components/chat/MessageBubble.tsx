import React from 'react';
import { Play, Pause, Check, CheckCheck, Bot, User } from 'lucide-react';
import { UIMessage, MessageDirection, MessageType } from '@/types';

interface MessageBubbleProps {
  msg: UIMessage;
  isPlaying: boolean;
  duration: number;
  progress: number;
  onTogglePlay: () => void;
  onSeek: (percent: number) => void;
  onAudioRef: (el: HTMLAudioElement | null) => void;
  onAudioLoaded: (duration: number) => void;
  onAudioTimeUpdate: (currentTime: number) => void;
  onAudioEnded: () => void;
}

const formatAudioTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isPlaying,
  duration,
  progress,
  onTogglePlay,
  onSeek,
  onAudioRef,
  onAudioLoaded,
  onAudioTimeUpdate,
  onAudioEnded,
}) => {
  const isOutgoing = msg.direction === MessageDirection.OUTGOING;

  const renderContent = () => {
    if (msg.type === MessageType.IMAGE) {
      return (
        <div className="mb-1 group relative">
          <img
            src={msg.mediaUrl || msg.content}
            alt="Anexo"
            className="rounded-lg max-w-full h-auto max-h-72 object-cover border border-slate-700/50 shadow-lg"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/1e293b/cbd5e1?text=Erro+Imagem';
            }}
          />
        </div>
      );
    }

    if (msg.type === MessageType.AUDIO) {
      return (
        <div className="flex items-center gap-3 min-w-[220px] py-1">
          {msg.mediaUrl && (
            <audio
              ref={onAudioRef}
              src={msg.mediaUrl}
              onLoadedMetadata={(e) => onAudioLoaded(e.currentTarget.duration)}
              onTimeUpdate={(e) => onAudioTimeUpdate(e.currentTarget.currentTime)}
              onEnded={onAudioEnded}
            />
          )}
          <button
            onClick={onTogglePlay}
            disabled={!msg.mediaUrl}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-md ${
              isOutgoing
                ? 'bg-white text-cyan-600 hover:bg-cyan-50 disabled:opacity-50'
                : 'bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
            )}
          </button>
          <div className="flex-1 flex flex-col gap-1 justify-center h-9">
            <div
              className={`h-1.5 rounded-full overflow-hidden cursor-pointer ${
                isOutgoing ? 'bg-white/30' : 'bg-slate-600'
              }`}
              onClick={(e) => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                onSeek((e.clientX - rect.left) / rect.width);
              }}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  isOutgoing ? 'bg-white' : 'bg-cyan-400'
                }`}
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium ${
              isOutgoing ? 'text-cyan-100' : 'text-slate-400'
            }`}>
              {formatAudioTime(progress)} / {formatAudioTime(duration)}
            </span>
          </div>
        </div>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex flex-col max-w-[75%] ${isOutgoing ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-5 py-3 rounded-2xl shadow-md relative text-sm leading-relaxed ${
            isOutgoing
              ? msg.fromType === 'nina'
                ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm shadow-violet-900/20'
                : 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white rounded-tr-sm shadow-cyan-900/20'
              : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50'
          }`}
        >
          {renderContent()}
        </div>

        <div className="flex items-center mt-1.5 gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity px-1">
          {isOutgoing && msg.fromType === 'nina' && <Bot className="w-3 h-3 text-violet-400" />}
          {isOutgoing && msg.fromType === 'human' && <User className="w-3 h-3 text-cyan-400" />}
          <span className="text-[10px] text-slate-500 font-medium">{msg.timestamp}</span>
          {isOutgoing && (
            msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-cyan-500" /> :
            msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 text-slate-500" /> :
            <Check className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
