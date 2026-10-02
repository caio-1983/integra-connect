import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PIX_CAPTION_HINT, PIX_HEADER_IMAGE, pixKeyLine, type PixCardData } from '@/lib/pix';

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

/**
 * What "Chave Pix" sends, on the chat wall — for the send confirmation and the
 * settings screen. Two ordinary messages: the logo with the details as caption,
 * then the key alone so the customer copies exactly the key. (Interactive cards
 * do not reach the customer through Evolution today; see pixCardStyle.)
 */
export const PixMessagesPreview: React.FC<{ pix: Pick<PixCardData, 'merchantName' | 'key' | 'keyType'> }> = ({ pix }) => {
  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const meta = <span className="float-right -mb-1 mt-2 ml-3 text-[11px] leading-none text-[var(--wa-meta)]">{now}</span>;
  const bubble = 'relative bg-[var(--wa-out)] shadow-wa-bubble text-[14.2px] leading-[19px] text-[var(--wa-text)] rounded-lg';
  return (
    <div className="chat-wall flex flex-col items-end gap-0.5 rounded-lg overflow-hidden px-6 py-5">
      <div className={cn(bubble, 'rounded-tr-none wa-tail-out p-1 w-[260px] max-w-full')}>
        <img src={PIX_HEADER_IMAGE} alt="Lumina" className="block w-full aspect-[1.91/1] object-cover rounded-md bg-white" />
        <p className="px-1.5 pt-1.5 pb-1 break-words">
          <strong className="font-semibold">Chave Pix</strong><br />
          {pix.merchantName}<br />
          {pixKeyLine(pix)}<br /><br />
          {PIX_CAPTION_HINT}
          {meta}
        </p>
      </div>
      <div className={cn(bubble, 'px-2 pt-1.5 pb-2 max-w-full')}>
        <p className="break-all">{pix.key}{meta}</p>
      </div>
    </div>
  );
};
