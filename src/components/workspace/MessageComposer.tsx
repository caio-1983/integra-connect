import React, { useRef } from 'react';
import { Paperclip, Mic, FileText, Bot, Send } from 'lucide-react';
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

const MessageComposer: React.FC<MessageComposerProps> = ({ value, onChange, onSend, onAttach, isNinaActive, sdrName }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <button type="button" disabled title="Em breve: Sugestão IA"   className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Bot      className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Nota interna"  className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><FileText className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Gravar áudio"  className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Mic      className="w-4 h-4" /></button>
        </div>

        {/* Input */}
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

        {/* Send */}
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim()}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
            value.trim()
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
