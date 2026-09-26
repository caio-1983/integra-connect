import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Send, X, Zap, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fetchQuickReplyImage, useQuickReplies, type QuickReply } from '@/hooks/useQuickReplies';
import { EmojiPicker } from './EmojiPicker';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** Sends a picked file as a WhatsApp attachment (any composer text rides as caption). */
  onAttach?: (file: File) => void;
  isNinaActive: boolean;
  sdrName: string;
  /** Message being replied to — shown above the input until sent or cancelled. */
  replyingTo?: { author: string; preview: string } | null;
  onCancelReply?: () => void;
}

const RECORDING_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

const MessageComposer: React.FC<MessageComposerProps> = ({
  value, onChange, onSend, onAttach, isNinaActive, sdrName, replyingTo, onCancelReply,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRef = useRef(false);

  const { quickReplies } = useQuickReplies();
  const [highlighted, setHighlighted] = useState(0);
  const [dismissedSlash, setDismissedSlash] = useState<string | null>(null);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  // Image of a picked quick reply, sent on the next send with the text as caption.
  const [pendingImage, setPendingImage] = useState<QuickReply | null>(null);
  const [sendingImage, setSendingImage] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Starting a reply puts the caret in the input, like WhatsApp.
  // Keyed on the text, not the object: the parent builds a new object each render.
  const replyKey = replyingTo ? `${replyingTo.author}\n${replyingTo.preview}` : null;
  useEffect(() => {
    if (replyKey) textareaRef.current?.focus();
  }, [replyKey]);

  // Release the microphone if the component unmounts mid-recording.
  useEffect(() => () => {
    stopTimer();
    stopStream();
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Gravação de áudio não é suportada neste navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      discardRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopStream();
        stopTimer();
        setIsRecording(false);
        setRecordingSeconds(0);

        if (!discardRef.current && audioChunksRef.current.length > 0 && onAttach) {
          const blobType = mimeType ?? 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: blobType });
          const extension = blobType.includes('mp4') ? 'mp4' : 'webm';
          onAttach(new File([blob], `audio-${Date.now()}.${extension}`, { type: blobType }));
        }
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone.');
    }
  };

  const finishRecording = (discard: boolean) => {
    discardRef.current = discard;
    mediaRecorderRef.current?.stop();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttach) onAttach(file);
    e.target.value = ''; // allow re-picking the same file
  };

  // Quick replies, WhatsApp Business style: a message that is just "/atalho"
  // opens the suggestion list above the input.
  const slashQuery = /^\/([^\s/]*)$/.exec(value)?.[1]?.toLowerCase();
  const suggestions = slashQuery === undefined || dismissedSlash === value
    ? []
    : quickReplies.filter(r => r.shortcut.includes(slashQuery) || r.message.toLowerCase().includes(slashQuery)).slice(0, 8);
  const activeSuggestion = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

  const applySuggestion = (reply: QuickReply) => {
    const { message } = reply;
    onChange(message);
    if (reply.imageUrl) setPendingImage(reply);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(message.length, message.length);
    });
  };

  const canSend = !!value.trim() || !!pendingImage;

  const handleSend = async () => {
    if (!pendingImage) { onSend(); return; }
    if (sendingImage || !onAttach) return;
    setSendingImage(true);
    try {
      onAttach(await fetchQuickReplyImage(pendingImage));
      setPendingImage(null);
    } catch {
      toast.error('Não foi possível carregar a imagem da resposta rápida.');
    } finally {
      setSendingImage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setHighlighted((activeSuggestion + step + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // don't also close the conversation
        setDismissedSlash(value);
        return;
      }
    }
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      e.stopPropagation(); // cancel the reply, keep the conversation open
      onCancelReply?.();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** Inserts text at the caret (or replacing the selection), then restores
   *  focus + caret so typing continues naturally. Falls back to append if the
   *  textarea ref isn't available. */
  const insertText = (text: string) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex-shrink-0">
      {replyingTo && !isRecording && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-primary bg-muted/60 px-3 py-2">
          <Reply className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <span className="block font-semibold text-primary">Respondendo a {replyingTo.author}</span>
            <span className="block text-muted-foreground truncate">{replyingTo.preview}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            title="Cancelar resposta"
            aria-label="Cancelar resposta"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {pendingImage?.imageUrl && !isRecording && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5">
          <img src={pendingImage.imageUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
          <span className="flex-1 min-w-0 text-xs text-muted-foreground">
            Imagem de <span className="font-mono text-primary">/{pendingImage.shortcut}</span> — o texto vai como legenda
          </span>
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            title="Remover imagem"
            aria-label="Remover imagem"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Attachment actions */}
        {!isRecording && (
          <div className="flex items-center gap-0.5 pb-1">
            <EmojiPicker onSelect={insertText} />
            <Popover open={quickRepliesOpen} onOpenChange={setQuickRepliesOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Respostas rápidas"
                  aria-label="Respostas rápidas"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-80 p-2">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider px-2 pt-1 pb-2">Respostas rápidas</p>
                {quickReplies.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 pb-2">
                    Nenhuma cadastrada. Admin ou gestor cadastra em Configurações.
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        type="button"
                        onClick={() => {
                          insertText(reply.message);
                          if (reply.imageUrl) setPendingImage(reply);
                          setQuickRepliesOpen(false);
                        }}
                        className="flex items-start gap-2 text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        {reply.imageUrl && (
                          <img src={reply.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-primary font-mono">/{reply.shortcut}</span>
                          <span className="block text-xs text-muted-foreground line-clamp-2">{reply.message}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={startRecording}
              title="Gravar áudio"
              aria-label="Gravar áudio"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input / Recording indicator */}
        {isRecording ? (
          <div className="flex-1 h-10 bg-background rounded-xl border border-border flex items-center gap-3 px-3">
            <button
              type="button"
              onClick={() => finishRecording(true)}
              title="Cancelar gravação"
              aria-label="Cancelar gravação"
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm text-foreground font-mono">{formatDuration(recordingSeconds)}</span>
            <span className="text-xs text-muted-foreground">Gravando áudio...</span>
          </div>
        ) : (
          <div className="relative flex-1 bg-background rounded-xl border border-border focus-within:ring-1 focus-within:ring-ring/30 focus-within:border-ring/50 transition-all">
            {suggestions.length > 0 && (
              <div role="listbox" className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-20 max-h-72 overflow-y-auto">
                {suggestions.map((reply, i) => (
                  <button
                    key={reply.id}
                    type="button"
                    role="option"
                    aria-selected={i === activeSuggestion}
                    onMouseDown={(e) => e.preventDefault()} // keep textarea focus
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => applySuggestion(reply)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg transition-colors',
                      i === activeSuggestion ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                  >
                    {reply.imageUrl && (
                      <img src={reply.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-primary font-mono">/{reply.shortcut}</span>
                      <span className="block text-xs text-muted-foreground truncate">{reply.message}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isNinaActive ? `${sdrName} está respondendo automaticamente...` : 'Digite sua mensagem... (Enter para enviar)'}
              className="w-full bg-transparent border-none p-3 max-h-28 min-h-[40px] text-sm text-foreground focus:ring-0 resize-none outline-none placeholder:text-muted-foreground"
              rows={1}
            />
          </div>
        )}

        {/* Send */}
        <button
          type="button"
          onClick={() => (isRecording ? finishRecording(false) : handleSend())}
          disabled={!isRecording && (!canSend || sendingImage)}
          title={isRecording ? 'Enviar áudio' : undefined}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            isRecording || canSend
              ? 'bg-gradient-to-br from-cyan-600 to-teal-700 text-white shadow-sm hover:scale-105 active:scale-95'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-40',
          )}
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
};

export { MessageComposer };
