import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import type { SidebarItemConfig } from './navigation.config';

interface SidebarItemProps {
  item: SidebarItemConfig;
  isActive: boolean;
}

/**
 * Item de navegação atômico — tema claro, aparência premium B2B.
 *
 * Estados (Design System — 05-design-system.md):
 *   Default:  texto slate neutro, sem fundo.
 *   Hover:    fundo slate-50 extremamente suave — sem sombra, sem glow.
 *   Focus:    anel de foco com token `primary`.
 *   Active:   fundo primary/10, texto primary, barra lateral primary, ícone primary.
 *
 * Usa tokens de cor do Design System (`primary`, `destructive`) em vez de
 * valores fixos blue-* para consistência com o restante do produto.
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive }) => {
  const { open, animate } = useSidebar();
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={!open ? item.label : undefined}
      className={cn(
        'group/item relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      {/* Barra lateral do estado ativo */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
      )}

      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors',
          isActive
            ? 'text-primary'
            : 'text-slate-400 group-hover/item:text-slate-500',
        )}
      />

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
