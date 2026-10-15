import React, { useState } from 'react';
import { Copy, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContactAvatar } from './ContactAvatar';
import { sharedContactName, sharedContactsMore, type SharedContact, type SharedContactPhone } from '@/lib/sharedContact';
import { cn } from '@/lib/utils';

async function copyNumber(phone: SharedContactPhone) {
  try {
    await navigator.clipboard.writeText(phone.number);
    toast.success('Número copiado');
  } catch {
    toast.error('Não foi possível copiar o número.');
  }
}

const footerButton = 'flex flex-1 items-center justify-center gap-2 pt-2 pb-1 text-[14px] font-medium text-[var(--wa-action)] hover:opacity-80 transition-opacity';

interface SharedContactCardProps {
  contacts: SharedContact[];
  /** Time + ticks, placed bottom-right above the buttons as in WhatsApp. */
  meta?: React.ReactNode;
  /** Opens (or starts) a conversation with that number; without it "Conversar" is hidden. */
  onMessage?: (digits: string, name?: string) => void;
  /** Bubble side — stacked avatars are ringed in the bubble's own color. */
  outgoing?: boolean;
}

/**
 * One or more shared contacts, drawn inside a bubble that has `p-1` — WhatsApp's
 * own card: who it is up top, actions on a strip below. A single contact with a
 * single number gets its actions right there; anything more opens the list.
 */
export const SharedContactCard: React.FC<SharedContactCardProps> = ({ contacts, meta, onMessage, outgoing }) => {
  const [listOpen, setListOpen] = useState(false);
  const single = contacts.length === 1 ? contacts[0] : null;
  const onlyPhone = single && single.phones.length === 1 ? single.phones[0] : null;
  const hasAnyPhone = contacts.some((c) => c.phones.length > 0);

  return (
    <div className="w-[280px] max-w-full">
      <div className="flex items-center gap-3 px-2 pt-2">
        {single ? (
          <ContactAvatar name={sharedContactName(single)} className="w-12 h-12 shrink-0 text-base" />
        ) : (
          <span className="flex shrink-0 -space-x-4">
            {/* Silhouettes, as WhatsApp stacks them: overlapped initials get clipped. */}
            {contacts.slice(0, 3).map((_, i) => (
              <ContactAvatar
                key={i}
                name=""
                className={cn('w-10 h-10 text-sm ring-2', outgoing ? 'ring-[var(--wa-out)]' : 'ring-[var(--wa-in)]')}
              />
            ))}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px]">{sharedContactName(contacts[0])}</p>
          {!single && (
            <p className="truncate text-[13px] text-[var(--wa-meta)]">
              {sharedContactsMore(contacts)}
            </p>
          )}
          {single && single.name.trim() && single.phones.length > 0 && (
            <p className="truncate text-[13px] text-[var(--wa-meta)]">
              {single.phones[0].number}
              {single.phones.length > 1 && ` e mais ${single.phones.length - 1}`}
            </p>
          )}
          {single && single.phones.length === 0 && (
            <p className="text-[13px] text-[var(--wa-meta)]">Cartão sem número</p>
          )}
        </div>
      </div>
      <div className="flex justify-end px-1.5 mt-1 min-h-[11px]">{meta}</div>

      {hasAnyPhone && (
        <>
          <div className="-mx-1 mt-1.5 border-t border-black/10 dark:border-white/10" />
          <div className="flex">
            {onlyPhone ? (
              <>
                {onMessage && (
                  <>
                    <button type="button" onClick={() => onMessage(onlyPhone.digits, single!.name || undefined)} className={footerButton}>
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      Conversar
                    </button>
                    <span className="my-1.5 border-l border-black/10 dark:border-white/10" aria-hidden="true" />
                  </>
                )}
                <button type="button" onClick={() => copyNumber(onlyPhone)} className={footerButton}>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  Copiar número
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setListOpen(true)} className={footerButton}>
                {single ? 'Ver números' : 'Ver todos'}
              </button>
            )}
          </div>
        </>
      )}

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-base">{single ? sharedContactName(single) : `${contacts.length} contatos`}</DialogTitle>
            <DialogDescription>Compartilhado nesta conversa</DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {contacts.flatMap((contact, ci) => {
              const name = sharedContactName(contact);
              const rows = contact.phones.length ? contact.phones : [null];
              return rows.map((phone, pi) => (
                <li key={`${ci}-${pi}`} className="flex items-center gap-3 px-4 py-2.5">
                  <ContactAvatar name={name} className={cn('w-9 h-9 shrink-0 text-sm', pi > 0 && 'invisible')} />
                  <div className="min-w-0 flex-1">
                    {pi === 0 && <p className="truncate text-sm font-medium text-foreground">{name}</p>}
                    {(pi > 0 || contact.name.trim() || !phone) && (
                      <p className="truncate text-xs text-muted-foreground">{phone?.number ?? 'Cartão sem número'}</p>
                    )}
                  </div>
                  {phone && (
                    <div className="flex shrink-0 gap-1">
                      {onMessage && (
                        <button
                          type="button"
                          onClick={() => { setListOpen(false); onMessage(phone.digits, contact.name || undefined); }}
                          title="Conversar"
                          aria-label={`Conversar com ${name}`}
                          className="p-2 rounded-full text-primary hover:bg-accent transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyNumber(phone)}
                        title="Copiar número"
                        aria-label={`Copiar número de ${name}`}
                        className="p-2 rounded-full text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ));
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
};
