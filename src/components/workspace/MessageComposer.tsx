import React from 'react';
import { Smile, Paperclip, Mic, FileText, Bot, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isNinaActive: boolean;
  sdrName: string;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ value, onChange, onSend, isNinaActive, sdrName }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-4 py-3 bg-card border-t border-border flex-shrink-0">
      <div className="flex items-end gap-2">
        {/* Attachment actions */}
        <div className="flex items-center gap-0.5 pb-1">
          <button type="button" disabled title="Em breve: Emoji"         className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Smile    className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Anexo"         className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Paperclip className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Sugestão IA"   className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Bot      className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Nota interna"  className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><FileText className="w-4 h-4" /></button>
          <button type="button" disabled title="Em breve: Gravar áudio"  className="p-1.5 rounded-lg text-muted-foreground/30 cursor-not-allowed"><Mic      className="w-4 h-4" /></button>
        </div>

        {/* Input */}
        <div className="flex-1 bg-background rounded-xl border border-border focus-within:ring-1 focus-within:ring-ring/30 focus-within:border-ring/50 transition-all">
          <textarea
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
