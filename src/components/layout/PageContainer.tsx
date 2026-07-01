import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * true (padrão): layout de coluna com scroll vertical — para páginas comuns.
   * false: layout flex-col sem scroll — para páginas com layout fixo (Kanban, Agenda).
   */
  scrollable?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  scrollable = true,
}) => {
  return (
    <div
      className={cn(
        'h-full p-6 bg-background text-foreground',
        scrollable
          ? 'overflow-y-auto custom-scrollbar space-y-6'
          : 'flex flex-col overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
};

export { PageContainer };
