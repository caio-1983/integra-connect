import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  /** Sends a picked file as a WhatsApp attachment (any composer text rides as caption). */
  onAttach?: (file: File) => void;
  isNinaActive: boolean;
  sdrName: string;
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

const MessageComposer: React.FC<MessageComposerProps> = ({ value, onChange, onSend, onAttach, isNinaActive, sdrName }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discardRef = useRef(false);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  /** Inserts an emoji at the caret (or replacing the selection), then restores
   *  focus + caret so typing continues naturally. Falls back to append if the
   *  textarea ref isn't available. */
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + emoji + value.slice(end));
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex-shrink-0">
      <div className="flex items-end gap-2">
        {/* Attachment actions */}
        {!isRecording && (
          <div className="flex items-center gap-0.5 pb-1">
            <EmojiPicker onSelect={insertEmoji} />
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
          <div className="flex-1 bg-background rounded-xl border border-border focus-within:ring-1 focus-within:ring-ring/30 focus-within:border-ring/50 transition-all">
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
          onClick={() => (isRecording ? finishRecording(false) : onSend())}
          disabled={!isRecording && !value.trim()}
          title={isRecording ? 'Enviar áudio' : undefined}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            isRecording || value.trim()
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
