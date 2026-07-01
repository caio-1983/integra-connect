import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-muted/30',
        compact ? 'py-6 px-4 gap-2' : 'py-10 px-6 gap-3',
        className,
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-full bg-muted',
        compact ? 'w-9 h-9' : 'w-12 h-12',
      )}>
        <Icon className={cn('text-muted-foreground', compact ? 'w-4 h-4' : 'w-5 h-5')} />
      </div>
      <div className="flex flex-col gap-1">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {title}
        </p>
        <p className={cn('text-muted-foreground leading-relaxed', compact ? 'text-[11px]' : 'text-xs')}>
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};

export { EmptyState };
export type { EmptyStateProps };
