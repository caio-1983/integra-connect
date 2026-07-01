import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Trilha de navegação hierárquica (UI-003).
 * Oculto automaticamente quando items estiver vazio.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  if (!items.length) return null;

  return (
    <nav aria-label="Navegação" className={cn('flex items-center gap-1', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight
              className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40"
              aria-hidden="true"
            />
          )}
          {item.href && index < items.length - 1 ? (
            <Link
              to={item.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'text-xs',
                index === items.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export { Breadcrumbs };
