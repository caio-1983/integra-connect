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
  border: string;
  glow: string;
  trend: { up: string; down: string };
}> = {
  cyan: {
    icon: 'text-cyan-400',
    border: 'from-cyan-500/10 to-transparent border-cyan-500/15',
    glow: 'bg-cyan-500/8',
    trend: { up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', down: 'bg-red-500/10 text-red-400 border-red-500/20' },
  },
  violet: {
    icon: 'text-violet-400',
    border: 'from-violet-500/10 to-transparent border-violet-500/15',
    glow: 'bg-violet-500/8',
    trend: { up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', down: 'bg-red-500/10 text-red-400 border-red-500/20' },
  },
  emerald: {
    icon: 'text-emerald-400',
    border: 'from-emerald-500/10 to-transparent border-emerald-500/15',
    glow: 'bg-emerald-500/8',
    trend: { up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', down: 'bg-red-500/10 text-red-400 border-red-500/20' },
  },
  amber: {
    icon: 'text-amber-400',
    border: 'from-amber-500/10 to-transparent border-amber-500/15',
    glow: 'bg-amber-500/8',
    trend: { up: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', down: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-8 w-8 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-7 w-16 bg-slate-800 rounded mb-2" />
        <div className="h-3 w-12 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br bg-slate-900/50 p-5',
        'transition-all duration-200 hover:bg-slate-900/80 group',
        theme.border,
      )}
    >
      {/* Ambient glow */}
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', theme.glow)} />

      <div className="relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-muted-foreground leading-tight">{label}</span>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/50">
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
