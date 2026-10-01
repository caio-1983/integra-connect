import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { isPending, whenLabel } from '@/lib/reminders';

/**
 * Ao entrar no sistema, mostra os lembretes de agendamento ainda não lidos
 * (véspera e "no dia" chegam assim). "Entendi" marca como lidos. Fechar sem
 * confirmar deixa para a próxima vez que a pessoa abrir o Integra.
 */
export const RemindersOnLogin: React.FC = () => {
  const { notifications, loaded, now, open, markRead } = useNotifications();
  const [shownIds, setShownIds] = useState<string[] | null>(null);
  const decided = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Decide uma vez por carga da página, com a primeira leitura da caixa.
  useEffect(() => {
    if (!loaded || decided.current) return;
    decided.current = true;
    const pending = notifications.filter(n => n.type === 'appointment_reminder' && isPending(n));
    if (pending.length) setShownIds(pending.map(n => n.id));
  }, [loaded, notifications]);

  const items = useMemo(() => {
    if (!shownIds) return [];
    return notifications
      .filter(n => shownIds.includes(n.id) && !n.readAt)
      .sort((a, b) => (a.eventAt ?? '').localeCompare(b.eventAt ?? ''));
  }, [shownIds, notifications]);

  return (
    <Dialog open={items.length > 0} onOpenChange={(o) => { if (!o) setShownIds(null); }}>
      {/* Foco em "Entendi", a ação principal, e não no primeiro "Ver na agenda". */}
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        onOpenAutoFocus={(e) => { e.preventDefault(); confirmRef.current?.focus(); }}
      >
        <div className="px-6 pt-6 pb-3">
          <DialogTitle className="text-xl font-normal text-foreground">Seus lembretes</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {items.length === 1 ? 'Você tem 1 compromisso chegando.' : `Você tem ${items.length} compromissos chegando.`}
          </DialogDescription>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto px-2 pb-2">
          {items.map(n => (
            <li key={n.id} className="flex items-center gap-3 rounded-lg px-4 py-2.5">
              <CalendarClock aria-hidden="true" className="w-5 h-5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-[15px] text-foreground">{n.title}</p>
                <p className="truncate text-sm text-muted-foreground tabular-nums">
                  {[n.eventAt ? whenLabel(n.eventAt, now) : null, n.body].filter(Boolean).join(' · ')}
                </p>
              </div>
              {n.link && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setShownIds(null); open(n); }} aria-label={`Ver ${n.title} na agenda`}>
                  <span className="sm:hidden">Ver</span>
                  <span className="hidden sm:inline">Ver na agenda</span>
                </Button>
              )}
            </li>
          ))}
        </ul>

        <div className="px-6 py-4 flex justify-end border-t border-border">
          <Button ref={confirmRef} type="button" onClick={() => void markRead(items.map(n => n.id))} className="min-w-24">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
