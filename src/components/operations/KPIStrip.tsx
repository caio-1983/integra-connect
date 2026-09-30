import React from 'react';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIItem {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

/** Trend strings that carry no comparison (e.g. the API's '-' for response time). */
const hasTrend = (trend?: string) => !!trend && trend.trim() !== '-' && trend.trim() !== '';

/** The day's numbers as one flat card split into cells — no tile per metric. */
export const KPIStrip: React.FC<{ items: KPIItem[]; loading?: boolean; failed?: boolean }> = ({ items, loading, failed }) => (
  <div className="rounded-lg bg-card border border-border grid grid-cols-2 lg:grid-cols-4 overflow-hidden" aria-busy={loading || undefined}>
    {items.map(({ label, value, hint, icon: Icon, trend, trendUp }, i) => {
      const showTrend = !loading && !failed && hasTrend(trend) && trendUp !== undefined;
      const flat = showTrend && /^[+-]?0(\.0+)?%$/.test(trend!.trim());
      const TrendIcon = flat ? Minus : trendUp ? TrendingUp : TrendingDown;
      return (
        <div
          key={label}
          className={cn(
            'px-6 py-5 flex flex-col gap-2 min-w-0 border-border',
            i % 2 === 0 && 'border-r', i < 2 && 'border-b lg:border-b-0',
            'lg:border-r lg:last:border-r-0',
          )}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="w-4 h-4 flex-shrink-0 text-icon" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            {loading ? (
              <span className="h-8 w-14 rounded bg-secondary animate-pulse" />
            ) : (
              <span className="text-[30px] leading-8 text-foreground tabular-nums">{failed ? '—' : value}</span>
            )}
            {showTrend && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium tabular-nums',
                  flat ? 'text-muted-foreground' : trendUp ? 'text-success' : 'text-danger',
                )}
              >
                <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">{flat ? 'Estável:' : trendUp ? 'Alta de' : 'Queda de'}</span>
                {flat ? '0%' : trend}
              </span>
            )}
          </div>
          <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
        </div>
      );
    })}
  </div>
);
