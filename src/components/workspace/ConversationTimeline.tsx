import React, { useRef, useState } from 'react';
import { MessageSquare, Bot, User, Check, CheckCheck, Play, Pause, Paperclip, Download } from 'lucide-react';
import { ChannelType, UIMessage, MessageDirection, MessageType } from '@/types';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';

const WAVE_BARS = 28;

/** Splits text on URLs (capturing group keeps the URLs) so message text with a
 *  link renders the link as a clickable anchor instead of dead text. */
const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g;
function linkify(text: string): React.ReactNode {
  return text.split(URL_SPLIT_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

/** Deterministic pseudo-waveform (0.18–1 heights) seeded by the message id, so
 *  every voice note gets a stable, distinct shape — the visual signature of a
 *  voice message — without needing the real amplitude data. xorshift over an
 *  FNV-1a hash of the id keeps it cheap and repeatable across renders. */
function waveformBars(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < WAVE_BARS; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    bars.push(0.18 + ((h >>> 0) % 1000) / 1000 * 0.82);
  }
  return bars;
}

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
  const [audioSpeed, setAudioSpeed] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const SPEED_LABEL: Record<number, string> = { 1: '1×', 1.5: '1,5×', 2: '2×' };

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
      const speed = audioSpeed[msg.id] || 1;

      const togglePlay = () => {
        const audio = audioRefs.current[msg.id];
        if (!audio) return;
        if (isPlaying) {
          audio.pause();
          setPlayingAudioId(null);
        } else {
          Object.values(audioRefs.current).forEach(a => a.pause());
          audio.playbackRate = speed;
          audio.play();
          setPlayingAudioId(msg.id);
        }
      };

      const cycleSpeed = () => {
        const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        setAudioSpeed(prev => ({ ...prev, [msg.id]: next }));
        const audio = audioRefs.current[msg.id];
        if (audio) audio.playbackRate = next;
      };

      const isOut = msg.direction === MessageDirection.OUTGOING;
      const bars = waveformBars(msg.id);
      const playedFraction = duration ? progress / duration : 0;

      const seek = (clientX: number, el: HTMLElement) => {
        const audio = audioRefs.current[msg.id];
        if (!audio || !duration) return;
        const rect = el.getBoundingClientRect();
        audio.currentTime = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
      };

      return (
        <div className="flex items-center gap-3 min-w-[228px] py-0.5">
          {msg.mediaUrl && (
            <audio
              ref={el => { if (el) audioRefs.current[msg.id] = el; }}
              src={msg.mediaUrl}
              onLoadedMetadata={(e) => {
                // Read synchronously — React nulls e.currentTarget once the
                // handler returns, and the setState updater runs after that.
                const d = e.currentTarget.duration;
                setAudioDurations(prev => ({ ...prev, [msg.id]: Number.isFinite(d) ? d : 0 }));
              }}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime;
                setAudioProgress(prev => ({ ...prev, [msg.id]: t }));
              }}
              onEnded={() => { setPlayingAudioId(null); setAudioProgress(prev => ({ ...prev, [msg.id]: 0 })); }}
            />
          )}
          <button
            onClick={togglePlay}
            disabled={!msg.mediaUrl}
            aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50',
              isOut ? 'bg-white text-slate-800 hover:bg-white/90' : 'bg-primary text-white hover:bg-primary/90',
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
          </button>
          <div
            className="flex-1 flex items-center gap-[2px] h-6 cursor-pointer"
            onClick={(e) => seek(e.clientX, e.currentTarget)}
          >
            {bars.map((bh, i) => {
              const played = i / WAVE_BARS <= playedFraction;
              return (
                <span
                  key={i}
                  className={cn(
                    'w-[3px] rounded-full transition-colors duration-150',
                    isOut
                      ? played ? 'bg-white' : 'bg-white/35'
                      : played ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${Math.round(bh * 100)}%` }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('text-[10px] font-medium tabular-nums', isOut ? 'text-white/70' : 'text-muted-foreground')}>
              {formatAudioTime(progress > 0 ? progress : duration)}
            </span>
            {(isPlaying || progress > 0) && (
              <button
                onClick={cycleSpeed}
                aria-label={`Velocidade ${SPEED_LABEL[speed]}`}
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none transition-colors',
                  isOut ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-muted-foreground/15 text-muted-foreground hover:bg-muted-foreground/25',
                )}
              >
                {SPEED_LABEL[speed]}
              </button>
            )}
          </div>
        </div>
      );
    }

    // Document/video (image & audio are handled above) reach here with a
    // mediaUrl but no dedicated player — render a downloadable attachment chip.
    // The kind emoji is already carried in `content` (📄 Documento / 🎥 Vídeo).
    if (msg.mediaUrl) {
      return (
        <a
          href={msg.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-black/5 dark:bg-white/5 px-3 py-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors max-w-full"
        >
          <Paperclip className="w-4 h-4 shrink-0 opacity-70" />
          <span className="text-sm truncate flex-1 min-w-0">{msg.content || 'Arquivo'}</span>
          <Download className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </a>
      );
    }

    return <p className="leading-relaxed whitespace-pre-wrap">{linkify(msg.content)}</p>;
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
