import React from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container para busca, filtros, abas e ações secundárias da página.
 * Posicionado entre o PageHeader e o conteúdo principal.
 */
const Toolbar: React.FC<ToolbarProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-3',
        className,
      )}
    >
      {children}
    </div>
  );
};

export { Toolbar };
