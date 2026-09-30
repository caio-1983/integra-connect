import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { UIMessage } from '@/types';

interface EditMessageDialogProps {
  /** Message being edited; null keeps the dialog closed. */
  message: UIMessage | null;
  onClose: () => void;
  onSave: (message: UIMessage, content: string) => void;
}

const MAX_INPUT_HEIGHT = 160;

/**
 * WhatsApp Web's "Editar mensagem": the original bubble on the chat wall, its
 * text below ready to change. Enter saves and Shift+Enter breaks the line, as
 * in the composer; Esc closes.
 */
export const EditMessageDialog: React.FC<EditMessageDialogProps> = ({ message, onClose, onSave }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyed on the id: a realtime refresh of the same message must not wipe what is being typed.
  useEffect(() => {
    setText(message?.content ?? '');
  }, [message?.id]);

  // Grows with the text up to a cap, then scrolls.
  const fitHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  };
  useLayoutEffect(fitHeight, [text]);

  const trimmed = text.trim();
  const canSave = !!message && !!trimmed && trimmed !== message.content;

  const save = () => {
    if (!message || !canSave) return;
    onSave(message, trimmed);
    onClose();
  };

  return (
    <Dialog open={!!message} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => {
          // Caret at the end of the text, like WhatsApp, instead of Radix's first-focusable.
          e.preventDefault();
          const el = textareaRef.current;
          if (!el) return;
          // Reopening the same message leaves `text` unchanged, so the effect
          // above would not size the freshly mounted field.
          fitHeight();
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }}
      >
        <DialogHeader className="px-5 py-4">
          <DialogTitle className="text-base font-medium">Editar mensagem</DialogTitle>
          <DialogDescription className="sr-only">
            O cliente passa a ver o texto novo, marcado como editado.
          </DialogDescription>
        </DialogHeader>

        <div className="chat-wall flex justify-end px-8 py-6">
          <div className="relative max-w-[85%] rounded-lg rounded-tr-none wa-tail-out bg-[var(--wa-out)] px-2 pt-1.5 pb-2 text-[14.2px] leading-[19px] text-[var(--wa-text)] shadow-wa-bubble">
            <p className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {message?.content}
              <span className="inline-block w-12" aria-hidden="true" />
              <span className="float-right -mb-1 mt-2 ml-2 text-[11px] leading-none text-[var(--wa-meta)]">
                {message?.timestamp}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-end gap-2 bg-muted px-4 py-3">
          <div className="flex-1 min-w-0 rounded-lg bg-card">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  save();
                }
              }}
              aria-label="Novo texto da mensagem"
              rows={1}
              className="block w-full min-h-[42px] resize-none border-none bg-transparent px-3 py-[10px] text-[15px] leading-[22px] text-foreground outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            title="Salvar"
            aria-label="Salvar edição"
            className="w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
