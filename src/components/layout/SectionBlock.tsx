import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionBlockProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  icon: Icon,
  description,
  action,
  children,
  className,
}) => {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex-shrink-0">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground leading-none">{title}</h2>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0">{action}</div>
        )}
      </div>
      {children}
    </section>
  );
};

export { SectionBlock };
export type { SectionBlockProps };
