import React, { useRef, useState } from 'react';
import { MessageSquare, Bot, User, Check, CheckCheck, Play, Pause } from 'lucide-react';
import { UIMessage, MessageDirection, MessageType } from '@/types';
import { cn } from '@/lib/utils';

interface ConversationTimelineProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({ messages, messagesEndRef }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioDurations, setAudioDurations] = useState<Record<string, number>>({});
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const formatAudioTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (msg: UIMessage) => {
    if (msg.type === MessageType.IMAGE) {
      return (
        <img
          src={msg.mediaUrl || msg.content}
          alt="Anexo"
          className="rounded-lg max-w-full h-auto max-h-72 object-cover border border-slate-700/50 shadow-lg"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/1e293b/cbd5e1?text=Erro+Imagem';
          }}
        />
      );
    }

    if (msg.type === MessageType.AUDIO) {
      const isPlaying = playingAudioId === msg.id;
      const duration = audioDurations[msg.id] || 0;
      const progress = audioProgress[msg.id] || 0;

      const togglePlay = () => {
        const audio = audioRefs.current[msg.id];
        if (!audio) return;
        if (isPlaying) {
          audio.pause();
          setPlayingAudioId(null);
        } else {
          Object.values(audioRefs.current).forEach(a => a.pause());
          audio.play();
          setPlayingAudioId(msg.id);
        }
      };

      return (
        <div className="flex items-center gap-3 min-w-[200px] py-1">
          {msg.mediaUrl && (
            <audio
              ref={el => { if (el) audioRefs.current[msg.id] = el; }}
              src={msg.mediaUrl}
              onLoadedMetadata={(e) => setAudioDurations(prev => ({ ...prev, [msg.id]: e.currentTarget.duration }))}
              onTimeUpdate={(e) => setAudioProgress(prev => ({ ...prev, [msg.id]: e.currentTarget.currentTime }))}
              onEnded={() => setPlayingAudioId(null)}
            />
          )}
          <button
            onClick={togglePlay}
            disabled={!msg.mediaUrl}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-md',
              msg.direction === MessageDirection.OUTGOING
                ? 'bg-white text-cyan-600 hover:bg-cyan-50 disabled:opacity-50'
                : 'bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50',
            )}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
          </button>
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div
              className={cn('h-1.5 rounded-full overflow-hidden cursor-pointer', msg.direction === MessageDirection.OUTGOING ? 'bg-white/30' : 'bg-slate-600')}
              onClick={(e) => {
                const audio = audioRefs.current[msg.id];
                if (!audio || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
              }}
            >
              <div
                className={cn('h-full rounded-full transition-all', msg.direction === MessageDirection.OUTGOING ? 'bg-white' : 'bg-cyan-400')}
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
            <span className={cn('text-[10px] font-medium', msg.direction === MessageDirection.OUTGOING ? 'text-cyan-100' : 'text-slate-400')}>
              {formatAudioTime(progress)} / {formatAudioTime(duration)}
            </span>
          </div>
        </div>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600">
        <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Nenhuma mensagem ainda</p>
        <p className="text-xs mt-1 opacity-60">Envie uma mensagem para iniciar a conversa</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center mb-4">
        <span className="px-4 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-medium rounded-full backdrop-blur-sm">
          Hoje
        </span>
      </div>

      {messages.map((msg) => {
        const isOutgoing = msg.direction === MessageDirection.OUTGOING;
        return (
          <div
            key={msg.id}
            className={cn(
              'flex group animate-in fade-in slide-in-from-bottom-2 duration-300',
              isOutgoing ? 'justify-end' : 'justify-start',
            )}
          >
            <div className={cn('flex flex-col max-w-[75%]', isOutgoing ? 'items-end' : 'items-start')}>
              <div className={cn(
                'px-4 py-2.5 rounded-2xl shadow-md text-sm leading-relaxed',
                isOutgoing
                  ? msg.fromType === 'nina'
                    ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm'
                    : 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50',
              )}>
                {renderMessageContent(msg)}
              </div>

              <div className="flex items-center mt-1 gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity px-1">
                {isOutgoing && msg.fromType === 'nina'  && <Bot  className="w-3 h-3 text-violet-400" />}
                {isOutgoing && msg.fromType === 'human' && <User className="w-3 h-3 text-cyan-400" />}
                <span className="text-[10px] text-slate-500 font-medium">{msg.timestamp}</span>
                {isOutgoing && (
                  msg.status === 'read'      ? <CheckCheck className="w-3.5 h-3.5 text-cyan-500" /> :
                  msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 text-slate-500" /> :
                                              <Check      className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </>
  );
};

export { ConversationTimeline };
