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

// Always visible — the ones an attendant checks all day. The chips wrap instead
// of scrolling sideways, so none of them ends up hidden past the column edge.
const PRIMARY: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all',     label: 'Todos'      },
  { key: 'unread',  label: 'Não lidas'  },
  { key: 'waiting', label: 'Aguardando' },
  { key: 'nina',    label: 'IA'         },
  { key: 'human',   label: 'Humano'     },
];

const MORE: Array<{ key: QueueFilter; label: string }> = [
  { key: 'mine',   label: 'Minhas'   },
  { key: 'paused', label: 'Pausados' },
];

const Count: React.FC<{ value: number; active: boolean }> = ({ value, active }) => (
  <span className={cn(
    'text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full',
    active ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground',
  )}>
    {value > 99 ? '99+' : value}
  </span>
);

const ConversationFilters: React.FC<ConversationFiltersProps> = ({ active, onChange, counts }) => {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = MORE.find((f) => f.key === active);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2">
      {PRIMARY.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1 px-2.5 h-7 rounded-full text-[13px] whitespace-nowrap transition-colors',
            active === key
              ? 'bg-[#d9fdd3] text-[#005c4b] dark:bg-[#005c4b] dark:text-[#d9fdd3] font-semibold'
              : 'bg-muted text-muted-foreground hover:text-foreground',
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
              'flex items-center gap-1 px-2.5 h-7 rounded-full text-[13px] whitespace-nowrap transition-colors',
              moreActive
                ? 'bg-[#d9fdd3] text-[#005c4b] dark:bg-[#005c4b] dark:text-[#d9fdd3] font-semibold'
                : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {moreActive ? moreActive.label : <MoreHorizontal className="w-3.5 h-3.5" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-40 p-1">
          {MORE.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { onChange(key); setMoreOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs hover:bg-muted',
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
