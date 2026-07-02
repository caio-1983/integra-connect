import React, { useRef, useState } from 'react';
import { MessageSquare, Bot, User, Check, CheckCheck, Play, Pause } from 'lucide-react';
import { ChannelType, UIMessage, MessageDirection, MessageType } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';

interface ConversationTimelineProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Conversation's predominant channel — used to detect when a message
   *  arrived through a different channel and surface a "via {label}" hint,
   *  proving the thread stays unified even as the channel varies. */
  primaryChannel: ChannelType;
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({ messages, messagesEndRef, primaryChannel }) => {
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
          className="rounded-lg max-w-full h-auto max-h-72 object-cover border border-border/50 shadow-sm"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/f1f5f9/64748b?text=Erro+Imagem';
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
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-sm',
              msg.direction === MessageDirection.OUTGOING
                ? 'bg-white text-cyan-600 hover:bg-cyan-50 disabled:opacity-50'
                : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
          </button>
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div
              className={cn('h-1.5 rounded-full overflow-hidden cursor-pointer', msg.direction === MessageDirection.OUTGOING ? 'bg-white/30' : 'bg-border')}
              onClick={(e) => {
                const audio = audioRefs.current[msg.id];
                if (!audio || !duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
              }}
            >
              <div
                className={cn('h-full rounded-full transition-all', msg.direction === MessageDirection.OUTGOING ? 'bg-white' : 'bg-primary')}
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
            <span className={cn('text-[10px] font-medium', msg.direction === MessageDirection.OUTGOING ? 'text-white/70' : 'text-muted-foreground')}>
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm">Nenhuma mensagem ainda</p>
        <p className="text-xs mt-1 opacity-60">Envie uma mensagem para iniciar a conversa</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center mb-4">
        <span className="px-4 py-1.5 bg-muted border border-border text-muted-foreground text-xs font-medium rounded-full">
          Hoje
        </span>
      </div>

      {messages.map((msg) => {
        const isOutgoing = msg.direction === MessageDirection.OUTGOING;
        const msgChannel = msg.channel ?? primaryChannel;
        const showChannelHint = msgChannel !== primaryChannel;
        const channelCfg = CHANNEL_CONFIG[msgChannel];
        const ChannelIcon = channelCfg.icon;
        return (
          <div
            key={msg.id}
            className={cn(
              'flex group animate-in fade-in slide-in-from-bottom-2 duration-300',
              isOutgoing ? 'justify-end' : 'justify-start',
            )}
          >
            <div className={cn('flex flex-col max-w-[75%]', isOutgoing ? 'items-end' : 'items-start')}>
              {showChannelHint && (
                <span className={cn('flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded text-[10px] font-medium border', channelCfg.color)}>
                  <ChannelIcon className="w-2.5 h-2.5" />
                  via {channelCfg.label}
                </span>
              )}
              <div className={cn(
                'px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed',
                isOutgoing
                  ? msg.fromType === 'nina'
                    ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-tr-sm'
                    : 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm border border-border',
              )}>
                {renderMessageContent(msg)}
              </div>

              <div className="flex items-center mt-1 gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity px-1">
                {isOutgoing && msg.fromType === 'nina'  && <Bot  className="w-3 h-3 text-violet-500" />}
                {isOutgoing && msg.fromType === 'human' && <User className="w-3 h-3 text-primary" />}
                <span className="text-[10px] text-muted-foreground font-medium">{msg.timestamp}</span>
                {isOutgoing && (
                  msg.status === 'read'      ? <CheckCheck className="w-3.5 h-3.5 text-primary" /> :
                  msg.status === 'delivered' ? <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" /> :
                                              <Check      className="w-3.5 h-3.5 text-muted-foreground" />
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
