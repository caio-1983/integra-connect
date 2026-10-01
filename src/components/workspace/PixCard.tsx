import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PIX_HEADER_IMAGE, pixKeyLine, type PixCardData } from '@/lib/pix';

/** The Pix mark (four rounded diamonds), as WhatsApp draws it on its own card. */
export const PixMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <g transform="rotate(45 12 12)">
      <rect x="4.6" y="4.6" width="6.6" height="6.6" rx="1.7" />
      <rect x="12.8" y="4.6" width="6.6" height="6.6" rx="1.7" />
      <rect x="4.6" y="12.8" width="6.6" height="6.6" rx="1.7" />
      <rect x="12.8" y="12.8" width="6.6" height="6.6" rx="1.7" />
    </g>
  </svg>
);

async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key);
    toast.success('Chave Pix copiada');
  } catch {
    toast.error('Não foi possível copiar a chave.');
  }
}

interface PixCardProps {
  card: PixCardData;
  /** Time + ticks, placed bottom-right above the button as in WhatsApp. */
  meta?: React.ReactNode;
  /** Small line under the text: the attendant's name on the branded card. */
  footer?: string;
}

/**
 * A Pix card as the customer sees it, drawn inside a bubble that has `p-1`.
 * `branded` is what the platform sends (logo header + text); `native` is
 * WhatsApp's own card, which the Business app sends from the phone.
 */
export const PixCard: React.FC<PixCardProps> = ({ card, meta, footer }) => (
  <div className="w-[280px] max-w-full">
    {card.variant === 'branded' ? (
      <>
        <img
          src={card.headerUrl || PIX_HEADER_IMAGE}
          alt="Lumina"
          className="block w-full aspect-[1.91/1] object-cover rounded-md bg-white"
        />
        <div className="px-1.5 pt-1.5">
          <p className="font-semibold">Chave Pix</p>
          <p className="mt-2 break-words">{card.merchantName}</p>
          <p className="break-words">{pixKeyLine(card)}</p>
          {footer && <p className="mt-1 text-[13px] text-[var(--wa-meta)]">{footer}</p>}
        </div>
      </>
    ) : (
      <div className="flex items-center gap-3 rounded-md bg-black/5 dark:bg-white/5 p-3">
        <span className="flex w-12 h-12 shrink-0 items-center justify-center rounded-full bg-[#32bcad]/15 text-[#32bcad]">
          <PixMark className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px]">{card.merchantName}</p>
          <p className="truncate text-[13px] text-[var(--wa-meta)]">{pixKeyLine(card)}</p>
        </div>
      </div>
    )}
    <div className="flex justify-end px-1.5 mt-1 min-h-[11px]">{meta}</div>
    <div className="-mx-1 mt-1.5 border-t border-black/10 dark:border-white/10" />
    <button
      type="button"
      onClick={() => copyKey(card.key)}
      className="flex w-full items-center justify-center gap-2 pt-2 pb-1 text-[14px] font-medium text-[var(--wa-action)] rounded-b-md hover:opacity-80 transition-opacity"
    >
      <Copy className="w-4 h-4" aria-hidden="true" />
      Copiar chave Pix
    </button>
  </div>
);

/** The card as it will leave, in an outgoing bubble on the chat wall — for the
 *  send confirmation and the settings screen, outside the timeline. */
export const PixBubblePreview: React.FC<{ card: PixCardData; footer?: string }> = ({ card, footer }) => {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="chat-wall flex justify-end rounded-lg overflow-hidden px-6 py-5">
      <div className="relative rounded-lg rounded-tr-none wa-tail-out bg-[var(--wa-out)] p-1 shadow-wa-bubble text-[14.2px] leading-[19px] text-[var(--wa-text)]">
        <PixCard card={card} footer={footer} meta={<span className="text-[11px] leading-none text-[var(--wa-meta)]">{now}</span>} />
      </div>
    </div>
  );
};
