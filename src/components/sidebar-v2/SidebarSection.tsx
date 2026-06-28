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
 * Agrupa itens de um mesmo domínio de negócio.
 *
 * Rótulo da seção: discreto, sem caixa-alta, sem tracking excessivo.
 * No estado colapsado o rótulo dá lugar a um divisor fino.
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
          className="px-2 pb-1 pt-3 text-[11px] font-medium text-slate-400"
        >
          {section.title}
        </motion.p>
      ) : (
        <div className="mx-2 my-3 h-px bg-slate-100" aria-hidden="true" />
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
