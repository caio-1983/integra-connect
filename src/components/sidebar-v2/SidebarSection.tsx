import React from 'react';
import { motion } from 'framer-motion';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarItem } from './SidebarItem';
import type { SidebarSectionConfig } from './navigation.config';

interface SidebarSectionProps {
  section: SidebarSectionConfig;
  currentPath: string;
}

/**
 * Agrupa itens de um mesmo domínio de negócio (UI-001 — Seções).
 *
 * Rótulo: 11px, medium, uppercase, tracking-wider, cinza suave.
 * Colapsado: divisor fino substitui o rótulo.
 */
export const SidebarSection: React.FC<SidebarSectionProps> = ({ section, currentPath }) => {
  const { open, animate } = useSidebar();
  const showLabel = !animate || open;

  return (
    <div className="flex flex-col gap-0.5">
      {showLabel ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-slate-400"
        >
          {section.title}
        </motion.p>
      ) : (
        <div className="mx-2 my-2 h-px bg-slate-100" aria-hidden="true" />
      )}

      <nav className="flex flex-col gap-0.5" aria-label={section.title}>
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={
              currentPath === item.href || currentPath.startsWith(`${item.href}/`)
            }
          />
        ))}
      </nav>
    </div>
  );
};
