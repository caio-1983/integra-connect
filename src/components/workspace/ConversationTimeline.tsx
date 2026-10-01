import React, { useMemo, useRef, useState } from 'react';
import { MessageSquare, Bot, Check, CheckCheck, Play, Pause, Paperclip, Download, Reply, Pencil, Sparkles, Camera, Mic, FileText, Video, Diamond, type LucideIcon } from 'lucide-react';
import { ChannelType, UIMessage, MessageDirection, MessageType } from '@/types';
import { cn, contactDisplayName } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/channelConfig';
import { PixCard } from './PixCard';

const WAVE_BARS = 40;

/** WhatsApp-style per-sender name colors in group threads — intentionally
 *  multi-hue (not brand tokens) so distinct participants read apart at a glance.
 *  Picked deterministically from the sender's phone/name so it's stable. */
const SENDER_COLORS = [
  'text-rose-500', 'text-amber-600', 'text-emerald-600',
  'text-sky-600', 'text-violet-500', 'text-fuchsia-500', 'text-teal-600',
];
function senderColorClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}

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
      <React.Fragment key={i}>{formatWhatsApp(part, i)}</React.Fragment>
    ),
  );
}

/** WhatsApp inline formatting — *bold*, _italic_, ~strike~, `mono` — so text
 *  reads here as the customer sees it (e.g. the `*Nome*` attendant signature).
 *  Markers only count at word edges, as in WhatsApp. */
const FORMAT_RE = /(?<![\w*_~`])(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)(?![\w*_~`])/g;
function formatWhatsApp(text: string, keyBase: number): React.ReactNode {
  return text.split(FORMAT_RE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (i % 2 === 1) { // split() puts the captured markers at odd indexes
      const inner = part.slice(1, -1);
      switch (part[0] + part[part.length - 1]) {
        case '**': return <strong key={key} className="font-semibold">{inner}</strong>;
        case '__': return <em key={key}>{inner}</em>;
        case '~~': return <s key={key}>{inner}</s>;
        case '``': return <code key={key} className="font-mono text-[13px]">{inner}</code>;
      }
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

/** Leading emoji the backend stores as a media placeholder, mapped to a drawn icon. */
const MEDIA_PREFIX: Array<[RegExp, LucideIcon]> = [
  [/^📷\s*/u, Camera], [/^(🎵|🎤)\s*/u, Mic], [/^📄\s*/u, FileText], [/^🎥\s*/u, Video],
];

/** Icon for a message preview (quote, reply bar, queue row), or null for plain text. */
export function previewIcon(msg: UIMessage | undefined, fallbackText = ''): LucideIcon | null {
  if (msg?.pix) return Diamond;
  if (msg?.type === MessageType.IMAGE) return Camera;
  if (msg?.type === MessageType.AUDIO) return Mic;
  const text = msg ? msg.content ?? '' : fallbackText;
  return MEDIA_PREFIX.find(([re]) => re.test(text))?.[1] ?? null;
}

/** Removes a leading media emoji so the drawn icon carries it instead. */
export function stripMediaEmoji(text: string): string {
  for (const [re] of MEDIA_PREFIX) if (re.test(text)) return text.replace(re, '');
  return text;
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

/** Calendar day a message belongs to. Optimistic `temp-` messages carry no
 *  `sentAt` yet — they were just sent, so they belong to today. */
function messageDay(msg: UIMessage): Date {
  return new Date(msg.sentAt ?? Date.now());
}

/** WhatsApp's day separator: "Hoje", "Ontem", the weekday within the last
 *  week, then the full date. Counted in calendar days, not 24h spans. */
function dayLabel(date: Date): string {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface ConversationTimelineProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Conversation's predominant channel — used to detect when a message
   *  arrived through a different channel and surface a "via {label}" hint,
   *  proving the thread stays unified even as the channel varies. */
  primaryChannel: ChannelType;
  /** Group thread — incoming messages are then labeled with their sender. */
  isGroup?: boolean;
  /** Customer's display name, used to label a quoted incoming message. */
  contactName?: string;
  /** Starts a reply to this message (WhatsApp "responder"). */
  onReply?: (msg: UIMessage) => void;
  /** Opens the edit dialog (WhatsApp "Editar"); offered only where `canEdit` says so. */
  onEdit?: (msg: UIMessage) => void;
  canEdit?: (msg: UIMessage) => boolean;
  /** Lu's one-line reading of what the customer asked, shown right after the message it was based on. */
  luNote?: { messageId: string; text: string; onOpen?: () => void } | null;
}

/**
 * The caption typed with a photo, or '' when there is none. `content` of an
 * image holds the caption when present, but otherwise a fallback: the
 * "📷 Imagem" placeholder (inbound), the file name (sent from the platform) or,
 * on legacy rows, the image URL itself — none of which is a caption.
 */
export function imageCaption(msg: UIMessage): string {
  const text = (msg.content ?? '').trim();
  if (!text || text === '📷 Imagem' || text === msg.mediaUrl) return '';
  if (/^https?:\/\/\S+$/i.test(text)) return '';
  if (/^\S+\.(jpe?g|png|webp|gif|heic|heif)$/i.test(text)) return '';
  return text;
}

/** One-line preview of a message, as shown inside a quote or the reply bar. */
export function messagePreview(msg: UIMessage): string {
  if (msg.pix) return 'Chave Pix';
  switch (msg.type) {
    case MessageType.IMAGE: return imageCaption(msg) || 'Foto';
    case MessageType.AUDIO: return 'Áudio';
    default: return stripMediaEmoji(msg.content || '') || 'Mensagem';
  }
}

/** Who wrote a message, from the attendant's point of view. */
export function messageAuthor(msg: UIMessage, contactName?: string, isGroup?: boolean): string {
  if (msg.direction === MessageDirection.OUTGOING) return msg.fromType === 'nina' ? 'IA' : 'Você';
  if (isGroup) return contactDisplayName(msg.senderName, msg.senderPhone, 'Participante');
  return contactName || 'Cliente';
}

const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  messages, messagesEndRef, primaryChannel, isGroup, contactName, onReply, onEdit, canEdit, luNote,
}) => {
  const messagesById = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages]);
  const [flashId, setFlashId] = useState<string | null>(null);

  /** Scrolls to the quoted original and briefly highlights it. */
  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    setTimeout(() => setFlashId(current => (current === id ? null : current)), 1500);
  };

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

  /** `meta` (time + ticks) is placed inside the audio player's bottom line, as WhatsApp does. */
  const renderMessageContent = (msg: UIMessage, meta?: React.ReactNode) => {
    if (msg.type === MessageType.IMAGE) {
      return (
        <img
          src={msg.mediaUrl || msg.content}
          alt="Anexo"
          className={cn(
            'block max-w-full h-auto max-h-72 object-cover border border-border/60',
            msg.replyToId ? 'rounded-xl' : 'rounded-[inherit]',
          )}
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

      const bars = waveformBars(msg.id);
      const playedFraction = duration ? progress / duration : 0;

      const seek = (clientX: number, el: HTMLElement) => {
        const audio = audioRefs.current[msg.id];
        if (!audio || !duration) return;
        const rect = el.getBoundingClientRect();
        audio.currentTime = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
      };

      return (
        <div className="flex items-center gap-2 w-[260px] max-w-full pt-1">
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
            className="flex items-center justify-center w-9 h-9 shrink-0 text-icon hover:text-[var(--wa-text)] active:scale-95 transition disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
          </button>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {/* WhatsApp waveform: grey bars, the played part tinted, a dot at the playhead. */}
            <div
              role="slider"
              aria-label="Posição do áudio"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(progress)}
              tabIndex={0}
              className="relative h-7 flex items-center justify-between cursor-pointer"
              onClick={(e) => seek(e.clientX, e.currentTarget)}
            >
              {bars.map((bh, i) => {
                const played = (i + 0.5) / WAVE_BARS <= playedFraction;
                return (
                  <span
                    key={i}
                    className={cn(
                      'w-[3px] shrink-0 rounded-full transition-colors duration-150',
                      played ? 'bg-read-receipt' : 'bg-[var(--wa-wave)]',
                    )}
                    style={{ height: `${Math.max(3, Math.round(bh * 26))}px` }}
                  />
                );
              })}
              <span
                aria-hidden="true"
                className="absolute top-1/2 w-3 h-3 -mt-1.5 -ml-1.5 rounded-full bg-read-receipt shadow-sm pointer-events-none"
                style={{ left: `${Math.min(100, playedFraction * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] leading-none text-[var(--wa-meta)]">
              <span className="tabular-nums">{formatAudioTime(progress > 0 ? progress : duration)}</span>
              {(isPlaying || progress > 0) && (
                <button
                  onClick={cycleSpeed}
                  aria-label={`Velocidade ${SPEED_LABEL[speed]}`}
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none bg-black/5 dark:bg-white/10 hover:bg-black/10"
                >
                  {SPEED_LABEL[speed]}
                </button>
              )}
              <span className="flex-1" />
              {meta}
            </div>
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
      {messages.map((msg, idx) => {
        const isOutgoing = msg.direction === MessageDirection.OUTGOING;
        const prev = messages[idx - 1];
        const day = messageDay(msg);
        const newDay = !prev || messageDay(prev).toDateString() !== day.toDateString();
        // WhatsApp groups a side's consecutive messages: only the first gets the
        // tail and the larger gap above it. A new day starts a new run.
        const firstOfRun = newDay || (prev.direction === MessageDirection.OUTGOING) !== isOutgoing;
        const msgChannel = msg.channel ?? primaryChannel;
        const showChannelHint = msgChannel !== primaryChannel;
        const channelCfg = CHANNEL_CONFIG[msgChannel];
        const ChannelIcon = channelCfg.icon;
        const quoted = msg.replyToId ? messagesById.get(msg.replyToId) : undefined;
        const canReply = !!onReply && !msg.id.startsWith('temp-');
        const caption = msg.type === MessageType.IMAGE ? imageCaption(msg) : '';
        const bareImage = msg.type === MessageType.IMAGE && !msg.replyToId && !caption;
        const isText = !msg.pix && msg.type !== MessageType.IMAGE && msg.type !== MessageType.AUDIO && !msg.mediaUrl;
        const hoverAction = 'self-center p-1.5 rounded-full text-[var(--wa-meta)] hover:bg-black/5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0';
        const replyButton = canReply && (
          <button
            type="button"
            onClick={() => onReply!(msg)}
            title="Responder"
            aria-label="Responder"
            className={hoverAction}
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        );
        const editButton = !!onEdit && !!canEdit?.(msg) && (
          <button
            type="button"
            onClick={() => onEdit(msg)}
            title="Editar"
            aria-label="Editar mensagem"
            className={hoverAction}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        );
        // Time + ticks live inside the bubble, bottom-right, as in WhatsApp.
        const meta = (
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] leading-none whitespace-nowrap',
            bareImage ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]' : 'text-[var(--wa-meta)]',
          )}>
            {isOutgoing && msg.fromType === 'nina' && <Bot aria-label="Enviada pela IA" className="w-3 h-3" />}
            {msg.editedAt && <span>Editada</span>}
            {msg.timestamp}
            {isOutgoing && (
              msg.status === 'read'      ? <CheckCheck aria-label="Lida" className="w-4 h-4 text-read-receipt" /> :
              msg.status === 'delivered' ? <CheckCheck aria-label="Entregue" className="w-4 h-4" /> :
                                          <Check      aria-label="Enviada" className="w-3.5 h-3.5" />
            )}
          </span>
        );
        return (
          <React.Fragment key={msg.id}>
          {newDay && (
            <div className={cn('flex justify-center', idx > 0 && 'mt-3')}>
              <span className="px-3 py-1.5 bg-[var(--wa-in)] text-[var(--wa-meta)] text-xs font-medium rounded-lg shadow-wa-bubble">
                {dayLabel(day)}
              </span>
            </div>
          )}
          <div
            id={`msg-${msg.id}`}
            className={cn(
              'flex group gap-1 rounded-lg transition-colors',
              isOutgoing ? 'justify-end' : 'justify-start',
              firstOfRun ? 'mt-3' : 'mt-0.5',
              flashId === msg.id && 'bg-primary/10',
            )}
          >
            {isOutgoing && editButton}
            {isOutgoing && replyButton}
            <div className={cn('flex flex-col max-w-[65%]', isOutgoing ? 'items-end' : 'items-start')}>
              {showChannelHint && (
                <span className={cn('flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded text-[10px] font-medium border', channelCfg.color)}>
                  <ChannelIcon className="w-2.5 h-2.5" />
                  via {channelCfg.label}
                </span>
              )}
              <div className={cn(
                'relative rounded-lg text-[14.2px] leading-[19px] text-[var(--wa-text)] shadow-wa-bubble',
                isOutgoing ? 'bg-[var(--wa-out)]' : 'bg-[var(--wa-in)]',
                firstOfRun && (isOutgoing ? 'rounded-tr-none wa-tail-out' : 'rounded-tl-none wa-tail-in'),
                msg.type === MessageType.IMAGE || msg.pix ? 'p-1' : 'px-2 pt-1.5 pb-2',
              )}>
                {!isOutgoing && isGroup && firstOfRun && (msg.senderName || msg.senderPhone) && (
                  <span className={cn('block mb-0.5 text-[12.8px] font-semibold', senderColorClass(msg.senderPhone || msg.senderName || ''))}>
                    {contactDisplayName(msg.senderName, msg.senderPhone, 'Participante')}
                  </span>
                )}
                {msg.replyToId && (
                  <button
                    type="button"
                    onClick={() => quoted && jumpTo(quoted.id)}
                    disabled={!quoted}
                    className={cn(
                      'block w-full text-left mb-1 px-2.5 py-1.5 rounded-md border-l-4 border-[var(--wa-quote)] bg-black/5 dark:bg-white/5 text-xs',
                      quoted ? 'cursor-pointer hover:bg-black/10 dark:hover:bg-white/10' : 'cursor-default',
                    )}
                  >
                    {quoted ? (
                      <>
                        <span className="block font-semibold text-[var(--wa-quote)]">{messageAuthor(quoted, contactName, isGroup)}</span>
                        <span className="flex items-start gap-1 text-[var(--wa-meta)]">
                          {(() => { const Icon = previewIcon(quoted); return Icon ? <Icon className="w-3.5 h-3.5 mt-px flex-shrink-0" aria-hidden="true" /> : null; })()}
                          <span className="line-clamp-2">{formatWhatsApp(messagePreview(quoted), 0)}</span>
                        </span>
                      </>
                    ) : (
                      <span className="italic text-[var(--wa-meta)]">Mensagem original não carregada</span>
                    )}
                  </button>
                )}
                {msg.pix ? (
                  <PixCard card={msg.pix} meta={meta} />
                ) : isText ? (
                  <p className="whitespace-pre-wrap break-words">
                    {linkify(msg.content)}
                    {/* Spacer so the floating time never overlaps the last line ("Editada" widens it). */}
                    <span className={cn('inline-block', msg.editedAt ? 'w-28' : 'w-16')} aria-hidden="true" />
                    <span className="float-right -mb-1 mt-2 ml-2">{meta}</span>
                  </p>
                ) : (
                  msg.type === MessageType.AUDIO ? renderMessageContent(msg, meta) : caption ? (
                    <>
                      {renderMessageContent(msg)}
                      {/* Photo caption, laid out like a text bubble (time floats after the last line). */}
                      <p className="whitespace-pre-wrap break-words px-1 pt-1.5 pb-1">
                        {linkify(caption)}
                        <span className="inline-block w-16" aria-hidden="true" />
                        <span className="float-right -mb-1 mt-2 ml-2">{meta}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      {renderMessageContent(msg)}
                      <div className={cn('flex justify-end', bareImage ? 'absolute right-2.5 bottom-2.5' : 'mt-1 px-1')}>
                        {meta}
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
            {!isOutgoing && replyButton}
          </div>
          {luNote?.messageId === msg.id && luNote.text && (
            <div className="flex justify-center my-3">
              <div className="flex items-center gap-2 max-w-[85%] pl-3 pr-1.5 py-1.5 rounded-lg bg-[var(--wa-in)] text-xs text-[var(--wa-meta)] shadow-wa-bubble">
                <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span><span className="font-bold text-primary">Lu anotou</span> {luNote.text}</span>
                {luNote.onOpen && (
                  <button
                    type="button"
                    onClick={luNote.onOpen}
                    className="flex-shrink-0 px-2 py-1 rounded-md bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                  >
                    Ver detalhes
                  </button>
                )}
              </div>
            </div>
          )}
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />
    </>
  );
};

export { ConversationTimeline };
