import React, { useEffect, useRef, useState } from 'react';
import { Bot, SquareCheck, Square } from 'lucide-react';
import type { Appointment, ScheduledTask } from '@/types';
import { cn } from '@/lib/utils';
import { WEEKDAYS_SHORT, hhmm, monthGrid, sameDay, ymd, type PersonColor } from './calendarUtils';

interface MonthViewProps {
  anchor: Date;
  appsOn: (date: string) => Appointment[];
  tasksOn: (date: string) => ScheduledTask[];
  colorOf: (userId?: string) => PersonColor;
  onCreate: (date: string) => void;
  onOpenDay: (d: Date) => void;
  onOpenAppointment: (a: Appointment) => void;
  onOpenTask: (t: ScheduledTask) => void;
}

// Cell geometry (px) used to work out how many 22px item rows fit in a day:
// 4+4 padding, 28 day number, 2px gaps.
const CELL_CHROME = 4 + 4 + 28 + 2;
const ITEM_ROW = 22 + 2;

export const MonthView: React.FC<MonthViewProps> = ({
  anchor, appsOn, tasksOn, colorOf, onCreate, onOpenDay, onOpenAppointment, onOpenTask,
}) => {
  const days = monthGrid(anchor);
  const today = new Date();
  const weeks = days.length / 7;

  // The month always fits the screen: weeks split the available height and each
  // day lists as many items as its height allows, the rest collapse into "+N".
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setGridHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const maxItems = gridHeight
    ? Math.max(1, Math.floor((gridHeight / weeks - CELL_CHROME) / ITEM_ROW))
    : 3;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div
        ref={gridRef}
        className="grid grid-cols-7 flex-1 min-h-0 overflow-hidden"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((d, i) => {
          const date = ymd(d);
          const out = d.getMonth() !== anchor.getMonth();
          const isToday = sameDay(d, today);
          const tasks = tasksOn(date);
          const apps = appsOn(date);
          const total = tasks.length + apps.length;
          // When everything doesn't fit, one row goes to "+N outros".
          const room = total > maxItems ? maxItems - 1 : maxItems;
          const shownTasks = tasks.slice(0, room);
          const shownApps = apps.slice(0, room - shownTasks.length);
          const hidden = total - shownTasks.length - shownApps.length;

          return (
            <div
              key={date}
              onClick={() => onCreate(date)}
              className={cn(
                'group relative min-h-0 overflow-hidden flex flex-col gap-0.5 p-1 border-border cursor-pointer transition-colors hover:bg-accent/50',
                i % 7 !== 6 && 'border-r',
                i < days.length - 7 && 'border-b',
                out && 'bg-background/40',
              )}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenDay(d); }}
                aria-label={`Ver ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                aria-current={isToday ? 'date' : undefined}
                className={cn(
                  'self-center sm:self-start min-w-[28px] h-7 flex-shrink-0 rounded-full text-[13px] tabular-nums flex items-center justify-center transition-colors',
                  isToday ? 'bg-primary text-primary-foreground font-semibold'
                    : out ? 'text-muted-foreground/60 hover:bg-secondary' : 'text-foreground hover:bg-secondary',
                )}
              >
                {d.getDate() === 1 && !isToday
                  ? <span className="px-1 whitespace-nowrap">{d.getDate()} {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  : d.getDate()}
              </button>

              {/* Phones get dots; the rows need room. */}
              {total > 0 && (
                <div className="flex sm:hidden justify-center gap-0.5 flex-wrap" aria-label={`${total} itens`}>
                  {[...tasks.map(t => colorOf(t.assigneeUserId)), ...apps.map(a => colorOf(a.user_id))].slice(0, 4).map((c, k) => (
                    <span key={k} className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
                  ))}
                </div>
              )}

              <div className="hidden sm:flex flex-col gap-0.5 min-h-0">
                {shownTasks.map(t => (
                  <button
                    key={`t-${t.id}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenTask(t); }}
                    title={`Tarefa · ${t.title} · ${t.contactName}`}
                    className={cn(
                      'w-full flex items-center gap-1 px-1.5 h-[22px] rounded text-xs text-left truncate',
                      colorOf(t.assigneeUserId).soft,
                      t.status === 'done' && 'opacity-60 line-through',
                    )}
                  >
                    {t.status === 'done'
                      ? <SquareCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      : <Square className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
                    <span className="truncate">{t.title}</span>
                  </button>
                ))}
                {shownApps.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenAppointment(a); }}
                    title={`${hhmm(a.time)} · ${a.title}`}
                    className={cn(
                      'w-full flex items-center gap-1.5 px-1.5 h-[22px] rounded text-xs text-left hover:bg-secondary',
                      a.status === 'completed' && 'opacity-60',
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', colorOf(a.user_id).dot)} aria-hidden="true" />
                    <span className="text-muted-foreground tabular-nums flex-shrink-0">{hhmm(a.time)}</span>
                    <span className={cn('truncate text-foreground', a.status === 'completed' && 'line-through')}>{a.title}</span>
                    {a.metadata?.source === 'nina_ai' && <Bot className="w-3 h-3 flex-shrink-0 text-icon" aria-label="Criado pela Lu" />}
                  </button>
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenDay(d); }}
                    className="w-full text-left px-1.5 h-[22px] rounded text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    +{hidden} {hidden === 1 ? 'outro' : 'outros'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
