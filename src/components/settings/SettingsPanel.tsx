import React, { useId } from 'react';
import { type LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A settings group, WhatsApp-style: green group title on a flat card. */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({ title, description, action, children }) => {
  const id = useId();
  return (
    <section aria-labelledby={id} className="rounded-lg bg-card border border-border overflow-hidden">
      <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
        <div className="min-w-0">
          <h2 id={id} className="text-base text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
};

interface SettingsRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  /** Makes the whole row a button with a chevron. */
  onClick?: () => void;
  trailing?: React.ReactNode;
}

/** Icon + title + subtitle row, like the entries of WhatsApp's settings drawer. */
export const SettingsRow: React.FC<SettingsRowProps> = ({ icon: Icon, title, subtitle, onClick, trailing }) => {
  const body = (
    <>
      <Icon className="w-5 h-5 flex-shrink-0 text-icon" aria-hidden="true" />
      {/* Trailing controls drop under the text when the row gets narrow. */}
      <div className="flex-1 min-w-0 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex-1 min-w-[12rem]">
          <p className="text-[17px] leading-[21px] text-foreground">{title}</p>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {trailing}
        {onClick && <ChevronRight className="w-5 h-5 flex-shrink-0 text-icon" aria-hidden="true" />}
      </div>
    </>
  );
  const cls = 'w-full flex items-center gap-5 px-6 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
};
