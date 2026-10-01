import React, { useState } from 'react';
import { Bell, CalendarClock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSidebar } from '@/components/ui/sidebar';
import { useNotifications } from '@/hooks/useNotifications';
import { isPending, whenLabel } from '@/lib/reminders';
import { cn } from '@/lib/utils';

/**
 * Sino de lembretes no rodapé da sidebar. Mesma anatomia do SidebarItem
 * (44px, ícone 20px, contador verde à direita ou no canto do ícone).
 */
export const NotificationBell: React.FC = () => {
  const { open: sidebarOpen, animate } = useSidebar();
  const labelVisible = !animate || sidebarOpen;
  const {
    notifications, pendingCount, now, open, markAllRead, desktopPermission, requestDesktopPermission,
  } = useNotifications();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const recent = notifications.slice(0, 20);
  const hasUnread = notifications.some(n => !n.readAt);
  const badgeText = pendingCount > 99 ? '99+' : String(pendingCount);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={!labelVisible ? 'Lembretes' : undefined}
          aria-label={pendingCount ? `Lembretes, ${pendingCount} novos` : 'Lembretes'}
          className={cn(
            'group/item relative flex min-h-[44px] w-full items-center gap-3.5 rounded-lg px-3 text-left text-[15px] text-foreground transition-colors duration-150',
            'focus-visible:ring-offset-0 hover:bg-sidebar-accent data-[state=open]:bg-secondary',
          )}
        >
          <span className="relative flex-shrink-0">
            <Bell aria-hidden="true" className="h-5 w-5 text-icon transition-colors group-hover/item:text-foreground" />
            {pendingCount > 0 && !labelVisible && (
              <span aria-hidden="true" className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground tabular-nums">
                {badgeText}
              </span>
            )}
          </span>
          {labelVisible && <span className="flex-1 min-w-0 truncate">Lembretes</span>}
          {pendingCount > 0 && labelVisible && (
            <span aria-hidden="true" className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-none text-primary-foreground tabular-nums">
              {badgeText}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent side="right" align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <h2 className="text-base text-foreground">Lembretes</h2>
          {hasUnread && (
            <button type="button" onClick={() => void markAllRead()} className="text-sm text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            Nenhum lembrete por enquanto. Na véspera e no dia de cada agendamento seu, o aviso aparece aqui.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto pb-1">
            {recent.map(n => {
              const pending = isPending(n, now);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => { setPopoverOpen(false); open(n); }}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <CalendarClock aria-hidden="true" className={cn('w-5 h-5 mt-0.5 flex-shrink-0', pending ? 'text-primary' : 'text-icon')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', pending ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                        {n.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground tabular-nums">
                        {[n.eventAt ? whenLabel(n.eventAt, now) : null, n.body].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {pending && <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" aria-label="Novo" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {desktopPermission === 'default' && (
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => void requestDesktopPermission()}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ativar avisos do Windows
            </button>
            <p className="mt-0.5 text-xs text-muted-foreground">Para ver o lembrete mesmo com o Integra em outra janela.</p>
          </div>
        )}
        {desktopPermission === 'denied' && (
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Os avisos do Windows estão bloqueados para este site. Libere no cadeado ao lado do endereço.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
