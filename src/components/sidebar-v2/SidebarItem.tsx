import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import type { SidebarItemConfig } from './navigation.config';

interface SidebarItemProps {
  item: SidebarItemConfig;
  isActive: boolean;
  /** Contagem exibida como círculo vermelho no canto do ícone (ex.: mensagens não lidas). Omitido/0 não renderiza nada. */
  badgeCount?: number;
}

/**
 * Item de navegação — linguagem do WhatsApp Web.
 *
 * 44px de altura, ícone 20px na cor `icon`, rótulo 15px em `foreground`.
 *   Hover:  fundo `sidebar-accent` (#f5f6f6 / #202c33).
 *   Active: fundo `secondary` (#f0f2f5 / #2a3942), ícone e texto em `foreground`.
 *   Badge:  contador verde como o de não lidas do WhatsApp — à direita com o
 *           menu aberto, no canto do ícone com o menu recolhido.
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, badgeCount }) => {
  const { open, animate } = useSidebar();
  const Icon = item.icon;
  const showBadge = !!badgeCount && badgeCount > 0;

  const labelVisible = !animate || open;
  const badgeText = showBadge ? (badgeCount! > 99 ? '99+' : String(badgeCount)) : '';

  return (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={!open ? item.label : undefined}
      className={cn(
        'group/item relative flex min-h-[44px] items-center gap-3.5 rounded-lg px-3 text-[15px] text-foreground transition-colors duration-150',
        'focus-visible:ring-offset-0',
        isActive ? 'bg-secondary font-medium' : 'hover:bg-sidebar-accent',
      )}
    >
      <span className="relative flex-shrink-0">
        <Icon
          aria-hidden="true"
          className={cn('h-5 w-5 transition-colors', isActive ? 'text-foreground' : 'text-icon group-hover/item:text-foreground')}
        />
        {showBadge && !labelVisible && (
          <span
            className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground tabular-nums"
            aria-label={`${badgeCount} não lidas`}
          >
            {badgeText}
          </span>
        )}
      </span>

      <motion.span
        animate={{
          display: labelVisible ? 'inline-block' : 'none',
          opacity: labelVisible ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 min-w-0 truncate"
      >
        {item.label}
      </motion.span>

      {showBadge && labelVisible && (
        <span
          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold leading-none text-primary-foreground tabular-nums"
          aria-label={`${badgeCount} não lidas`}
        >
          {badgeText}
        </span>
      )}
    </Link>
  );
};
