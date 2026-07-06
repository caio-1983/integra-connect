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
 * Item de navegação atômico — tema claro, aparência premium B2B (UI-001).
 *
 * Dimensões: altura 48px | padding 16px | ícone 20px | texto 15px | gap 12px.
 *
 * Estados (Design System — 05-design-system.md + UI-001 paleta):
 *   Default:  texto slate-700, sem fundo.
 *   Hover:    bg-slate-50 (#F8FAFC) — sem glow, sem sombra.
 *   Focus:    anel violet-500/30.
 *   Active:   bg-violet-50 (#F5F3FF), texto violet-700, barra esquerda 3px violet-600.
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, badgeCount }) => {
  const { open, animate } = useSidebar();
  const Icon = item.icon;
  const showBadge = !!badgeCount && badgeCount > 0;

  return (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={!open ? item.label : undefined}
      className={cn(
        'group/item relative flex min-h-[48px] items-center gap-3 rounded-lg px-4 text-[15px] transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        isActive
          ? 'bg-violet-50 font-medium text-violet-700'
          : 'font-normal text-slate-700 hover:bg-slate-50 hover:text-slate-900',
      )}
    >
      {/* Barra lateral do estado ativo — 3px, UI-001 */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-600" />
      )}

      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-5 w-5 transition-colors',
            isActive
              ? 'text-violet-600'
              : 'text-slate-400 group-hover/item:text-slate-600',
          )}
        />
        {showBadge && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            aria-label={`${badgeCount} não lidas`}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </span>

      <motion.span
        animate={{
          display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="whitespace-pre"
      >
        {item.label}
      </motion.span>
    </Link>
  );
};
