import React from 'react';
import { Clock, MessageSquare, AlertCircle, Calendar, Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { cn } from '@/lib/utils';

export interface ActionItem {
  id: string;
  type: 'conversation' | 'appointment' | 'authorization' | 'integration' | 'overdue';
  label: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href?: string;
  meta?: string;
}

interface ImmediateActionsProps {
  items: ActionItem[];
  loading?: boolean;
}

const urgencyConfig = {
  high:   { dot: 'bg-red-500',    label: 'bg-red-500/10 text-red-400 border-red-500/20'    },
  medium: { dot: 'bg-amber-500',  label: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low:    { dot: 'bg-slate-500',  label: 'bg-slate-700 text-slate-400 border-slate-600'    },
};

const typeIcon: Record<ActionItem['type'], React.ElementType> = {
  conversation: MessageSquare,
  appointment:  Calendar,
  authorization: AlertCircle,
  integration:  Zap,
  overdue:      Clock,
};

const ImmediateActions: React.FC<ImmediateActionsProps> = ({ items, loading = false }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/60 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-slate-800 rounded" />
              <div className="h-2.5 w-48 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Zap}
        title="Nenhuma ação imediata"
        description="Tudo em dia. Quando houver conversas aguardando, pendências ou integrações offline, elas aparecerão aqui."
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/60 overflow-hidden">
      {items.map((item) => {
        const ItemIcon = typeIcon[item.type];
        const urgency = urgencyConfig[item.urgency];

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-4 px-4 py-3.5 transition-colors duration-150',
              'hover:bg-slate-800/40 group',
            )}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 border border-slate-700/50 flex-shrink-0 group-hover:border-slate-600 transition-colors">
              <ItemIcon className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-none">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {item.meta && (
                <span className="text-xs text-muted-foreground hidden sm:block">{item.meta}</span>
              )}
              <div className={cn('flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border', urgency.label)}>
                <div className={cn('w-1.5 h-1.5 rounded-full', urgency.dot)} />
                {item.urgency === 'high' ? 'Urgente' : item.urgency === 'medium' ? 'Pendente' : 'Atenção'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { ImmediateActions };
