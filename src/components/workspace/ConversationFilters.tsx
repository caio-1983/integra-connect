import React from 'react';
import { cn } from '@/lib/utils';

export type QueueFilter = 'all' | 'unread' | 'nina' | 'human' | 'paused';

interface ConversationFiltersProps {
  active: QueueFilter;
  onChange: (filter: QueueFilter) => void;
  counts: Record<QueueFilter, number>;
}

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all',    label: 'Todos'     },
  { key: 'unread', label: 'Não lidas' },
  { key: 'nina',   label: 'IA'        },
  { key: 'human',  label: 'Humano'    },
  { key: 'paused', label: 'Pausados'  },
];

const ConversationFilters: React.FC<ConversationFiltersProps> = ({ active, onChange, counts }) => {
  return (
    <div className="flex items-center gap-1 px-3 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {FILTERS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all',
            active === key
              ? 'bg-slate-700 text-white'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
          )}
        >
          {label}
          {counts[key] > 0 && key !== 'all' && (
            <span className={cn(
              'text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full',
              active === key ? 'bg-slate-600 text-slate-200' : 'bg-slate-800 text-slate-500',
            )}>
              {counts[key] > 9 ? '9+' : counts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export { ConversationFilters };
