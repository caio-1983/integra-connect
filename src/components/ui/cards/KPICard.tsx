import React from 'react';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  subLabel?: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  /** Tailwind color token suffix, e.g. 'cyan', 'violet', 'emerald', 'amber' */
  color: 'cyan' | 'violet' | 'emerald' | 'amber';
  loading?: boolean;
}

const colorMap: Record<KPICardProps['color'], {
  icon: string;
  bg: string;
  iconContainer: string;
  trend: { up: string; down: string };
}> = {
  cyan: {
    icon: 'text-cyan-600',
    bg: 'from-cyan-50 to-transparent border-cyan-200',
    iconContainer: 'bg-cyan-50 border-cyan-200',
    trend: { up: 'bg-emerald-50 text-emerald-700 border-emerald-200', down: 'bg-red-50 text-red-700 border-red-200' },
  },
  violet: {
    icon: 'text-violet-600',
    bg: 'from-violet-50 to-transparent border-violet-200',
    iconContainer: 'bg-violet-50 border-violet-200',
    trend: { up: 'bg-emerald-50 text-emerald-700 border-emerald-200', down: 'bg-red-50 text-red-700 border-red-200' },
  },
  emerald: {
    icon: 'text-emerald-600',
    bg: 'from-emerald-50 to-transparent border-emerald-200',
    iconContainer: 'bg-emerald-50 border-emerald-200',
    trend: { up: 'bg-emerald-50 text-emerald-700 border-emerald-200', down: 'bg-red-50 text-red-700 border-red-200' },
  },
  amber: {
    icon: 'text-amber-600',
    bg: 'from-amber-50 to-transparent border-amber-200',
    iconContainer: 'bg-amber-50 border-amber-200',
    trend: { up: 'bg-emerald-50 text-emerald-700 border-emerald-200', down: 'bg-amber-50 text-amber-700 border-amber-200' },
  },
};

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subLabel,
  trend,
  trendUp,
  icon: Icon,
  color,
  loading = false,
}) => {
  const theme = colorMap[color];

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
        <div className="h-7 w-16 bg-muted rounded mb-2" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br bg-card p-5',
        'transition-all duration-200 hover:shadow-sm',
        theme.bg,
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg border', theme.iconContainer)}>
            <Icon className={cn('w-4 h-4', theme.icon)} />
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-bold text-foreground tracking-tight leading-none">
            {value}
          </span>
          {trend !== undefined && trendUp !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border flex-shrink-0',
              trendUp ? theme.trend.up : theme.trend.down,
            )}>
              {trendUp
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {trend}
            </div>
          )}
        </div>

        {subLabel && (
          <span className="text-[11px] text-muted-foreground">{subLabel}</span>
        )}
      </div>
    </div>
  );
};

export { KPICard };
export type { KPICardProps };
