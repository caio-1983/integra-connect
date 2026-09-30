import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type QueueFilter = 'all' | 'unread' | 'waiting' | 'nina' | 'human' | 'paused' | 'mine';

interface ConversationFiltersProps {
  active: QueueFilter;
  onChange: (filter: QueueFilter) => void;
  counts: Record<QueueFilter, number>;
}

// The ones an attendant checks all day, on a single row that scrolls sideways
// like WhatsApp's; the rest live behind the "…" chip.
const PRIMARY: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all',     label: 'Todos'      },
  { key: 'unread',  label: 'Não lidas'  },
  { key: 'waiting', label: 'Aguardando' },
  { key: 'nina',    label: 'Lu'         },
  { key: 'human',   label: 'Humano'     },
];

const MORE: Array<{ key: QueueFilter; label: string }> = [
  { key: 'mine',   label: 'Minhas'   },
  { key: 'paused', label: 'Pausados' },
];

const Count: React.FC<{ value: number; active: boolean }> = ({ value, active }) => (
  <span className={cn(
    'text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full',
    active ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
  )}>
    {value > 99 ? '99+' : value}
  </span>
);

const ConversationFilters: React.FC<ConversationFiltersProps> = ({ active, onChange, counts }) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = MORE.find((f) => f.key === active);

  return (
    <div className="flex flex-nowrap items-center gap-2 px-3 pb-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PRIMARY.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={active === key}
          onClick={() => onChange(key)}
          className={cn(
            'flex flex-shrink-0 items-center gap-1.5 px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
            active === key
              ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
              : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          {label}
          {counts[key] > 0 && key !== 'all' && key !== 'human' && <Count value={counts[key]} active={active === key} />}
        </button>
      ))}

      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Mais filtros"
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
              moreActive
                ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
                : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {moreActive ? moreActive.label : <MoreHorizontal className="w-3.5 h-3.5" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-44 p-1.5">
          {MORE.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setMoreOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-accent',
                active === key ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
              {counts[key] > 0 && <Count value={counts[key]} active={active === key} />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { ConversationFilters };
