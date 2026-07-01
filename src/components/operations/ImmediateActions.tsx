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
  high:   { dot: 'bg-red-500',    label: 'bg-red-50 text-red-700 border-red-200'       },
  medium: { dot: 'bg-amber-500',  label: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { dot: 'bg-muted-foreground', label: 'bg-muted text-muted-foreground border-border' },
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
      <div className="rounded-xl border border-border bg-card divide-y divide-border animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="w-9 h-9 rounded-lg bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-2.5 w-48 bg-muted/60 rounded" />
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
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {items.map((item) => {
        const ItemIcon = typeIcon[item.type];
        const urgency = urgencyConfig[item.urgency];

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-4 px-4 py-3.5 transition-colors duration-150',
              'hover:bg-muted/50 group',
            )}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted border border-border flex-shrink-0 transition-colors">
              <ItemIcon className="w-4 h-4 text-muted-foreground" />
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
