import React, { useEffect, useRef, useState } from 'react';
import { Bot, Square, SquareCheck } from 'lucide-react';
import type { Appointment, ScheduledTask } from '@/types';
import { cn } from '@/lib/utils';
import { endTime, fromMinutes, hhmm, layoutDay, sameDay, ymd, type PersonColor } from './calendarUtils';

interface TimeGridViewProps {
  days: Date[];
  appsOn: (date: string) => Appointment[];
  tasksOn: (date: string) => ScheduledTask[];
  colorOf: (userId?: string) => PersonColor;
  onCreate: (date: string, time: string) => void;
  onOpenDay: (d: Date) => void;
  onOpenAppointment: (a: Appointment) => void;
  onOpenTask: (t: ScheduledTask) => void;
}

const HOUR = 48; // px per hour
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Week and day views: a 24h grid with events placed by start time and duration. */
export const TimeGridView: React.FC<TimeGridViewProps> = ({
  days, appsOn, tasksOn, colorOf, onCreate, onOpenDay, onOpenAppointment, onOpenTask,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const isSingle = days.length === 1;
  const key = ymd(days[0]);
  const hasToday = days.some(d => sameDay(d, now));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Open on the working day: an hour before now when today is visible, else 07:00.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = hasToday ? Math.max(0, nowMin - 90) : 7 * 60;
    el.scrollTop = (target / 60) * HOUR;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, days.length]);

  const anyTasks = days.some(d => tasksOn(ymd(d)).length > 0);
  const cols = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };

  const handleSlot = (date: string, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = Math.floor((y / HOUR) * 2) * 30; // 30-minute steps
    onCreate(date, fromMinutes(Math.min(min, 23 * 60 + 30)));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Day headers + all-day tasks */}
      <div className="border-b border-border overflow-hidden [scrollbar-gutter:stable]">
        <div className="grid" style={cols}>
          <div />
          {days.map(d => {
            const isToday = sameDay(d, now);
            return (
              <div key={ymd(d)} className={cn('py-2 flex flex-col items-center gap-0.5', isSingle && 'items-start pl-3')}>
                <span className={cn('text-[11px] font-medium uppercase', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  disabled={isSingle}
                  aria-label={`Ver ${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                  aria-current={isToday ? 'date' : undefined}
                  className={cn(
                    'w-10 h-10 rounded-full text-[22px] leading-none tabular-nums flex items-center justify-center transition-colors disabled:cursor-default',
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent disabled:hover:bg-transparent',
                  )}
                >
                  {d.getDate()}
                </button>
              </div>
            );
          })}
        </div>
        {anyTasks && (
          <div className="grid" style={cols}>
            <div className="text-[10px] text-muted-foreground text-right pr-2 pt-1.5">Tarefas</div>
            {days.map(d => (
              <div key={ymd(d)} className="p-1 flex flex-col gap-0.5 min-w-0 border-l border-border">
                {tasksOn(ymd(d)).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTask(t)}
                    title={`Tarefa · ${t.title} · ${t.contactName}`}
                    className={cn('w-full flex items-center gap-1 px-1.5 h-[22px] rounded text-xs text-left', colorOf(t.assigneeUserId).soft, t.status === 'done' && 'opacity-60 line-through')}
                  >
                    {t.status === 'done' ? <SquareCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" /> : <Square className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
                    <span className="truncate">{t.title}{isSingle ? ` · ${t.contactName}` : ''}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="grid relative" style={{ ...cols, height: 24 * HOUR }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.slice(1).map(h => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums" style={{ top: h * HOUR }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map(d => {
            const date = ymd(d);
            const placed = layoutDay(appsOn(date));
            const isToday = sameDay(d, now);
            return (
              <div
                key={date}
                onClick={(e) => handleSlot(date, e)}
                className="relative border-l border-border cursor-pointer"
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR - 1}px, hsl(var(--border)) ${HOUR - 1}px, hsl(var(--border)) ${HOUR}px)` }}
              >
                {placed.map(({ app, start, end, col, cols: n }) => {
                  const height = Math.max(((end - start) / 60) * HOUR - 2, 20);
                  const compact = height < 40;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenAppointment(app); }}
                      title={`${hhmm(app.time)}–${endTime(app)} · ${app.title}`}
                      className={cn(
                        'absolute rounded-md px-2 text-left overflow-hidden ring-1 ring-card transition-colors z-[1]',
                        compact ? 'py-0.5 flex items-center gap-1.5' : 'py-1',
                        colorOf(app.user_id).soft,
                        app.status === 'completed' && 'opacity-60',
                      )}
                      style={{ top: (start / 60) * HOUR + 1, height, left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
                    >
                      <span className={cn('block truncate text-xs font-semibold', app.status === 'completed' && 'line-through')}>
                        {app.metadata?.source === 'nina_ai' && <Bot className="inline w-3 h-3 mr-1 -mt-0.5" aria-label="Criado pela Lu" />}
                        {app.title}
                      </span>
                      <span className={cn('block truncate text-[11px] opacity-80 tabular-nums', compact && 'flex-shrink-0')}>
                        {hhmm(app.time)}{compact ? '' : ` – ${endTime(app)}`}
                        {!compact && isSingle && app.contact?.name ? ` · ${app.contact.name}` : ''}
                      </span>
                    </button>
                  );
                })}

                {isToday && (
                  <div className="absolute left-0 right-0 z-[2] pointer-events-none" style={{ top: (nowMin / 60) * HOUR }} aria-hidden="true">
                    <div className="relative h-0.5 bg-danger">
                      <span className="absolute -left-1.5 -top-[5px] w-3 h-3 rounded-full bg-danger" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
