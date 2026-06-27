import React, { useState } from 'react';
import { Smile, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/Button';

interface MessageInputProps {
  isAIMode: boolean;
  sdrName: string;
  onSendMessage: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ isAIMode, sdrName, onSendMessage }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = inputText.trim();
    if (!content) return;
    setInputText('');
    onSendMessage(content);
  };

  return (
    <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-sm z-10">
      <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            title="Em breve: Emoji picker"
            className="text-slate-500 rounded-full cursor-not-allowed opacity-50"
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            title="Em breve: Enviar anexos"
            className="text-slate-500 rounded-full cursor-not-allowed opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/50 transition-all shadow-inner">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={isAIMode ? `${sdrName} está respondendo automaticamente...` : 'Digite sua mensagem...'}
            className="w-full bg-transparent border-none p-3.5 max-h-32 min-h-[48px] text-sm text-slate-200 focus:ring-0 resize-none outline-none placeholder:text-slate-600"
            rows={1}
          />
        </div>

        <Button
          type="submit"
          disabled={!inputText.trim()}
          className={`rounded-full w-12 h-12 p-0 transition-all ${
            inputText.trim()
              ? 'shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95'
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5 ml-0.5" />
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
