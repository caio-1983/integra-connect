import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEEKDAYS_SHORT, capitalize, monthGrid, sameDay, ymd } from './calendarUtils';

interface MiniMonthProps {
  selected: Date;
  onSelect: (d: Date) => void;
  /** Dates (YYYY-MM-DD) that have something scheduled — they get a dot. */
  busy: Set<string>;
}

/** Month navigator for the side rail, independent of the main view's month. */
export const MiniMonth: React.FC<MiniMonthProps> = ({ selected, onSelect, busy }) => {
  const [anchor, setAnchor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  useEffect(() => { setAnchor(new Date(selected.getFullYear(), selected.getMonth(), 1)); }, [selected]);

  const today = new Date();
  const shift = (n: number) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));

  return (
    <div>
      <div className="flex items-center justify-between pl-2 mb-1">
        <span className="text-sm font-medium text-foreground">
          {capitalize(anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
        </span>
        <div className="flex">
          <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior" className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Próximo mês" className="w-8 h-8 rounded-full flex items-center justify-center text-icon hover:bg-accent">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS_SHORT.map(d => (
          <span key={d} className="h-7 flex items-center justify-center text-[11px] text-muted-foreground">{d.charAt(0)}</span>
        ))}
        {monthGrid(anchor).map(d => {
          const out = d.getMonth() !== anchor.getMonth();
          const isToday = sameDay(d, today);
          const isSel = sameDay(d, selected);
          return (
            <button
              key={ymd(d)}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'relative mx-auto w-8 h-8 rounded-full text-xs tabular-nums flex items-center justify-center transition-colors',
                isToday ? 'bg-primary text-primary-foreground font-semibold'
                  : isSel ? 'bg-primary-subtle text-primary-subtle-foreground font-semibold'
                  : out ? 'text-muted-foreground/60 hover:bg-accent' : 'text-foreground hover:bg-accent',
              )}
            >
              {d.getDate()}
              {busy.has(ymd(d)) && !isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
