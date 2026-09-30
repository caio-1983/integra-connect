import React from 'react';
import { motion } from 'framer-motion';
import { useSidebar } from '@/components/ui/sidebar';
import { SidebarItem } from './SidebarItem';
import type { SidebarSectionConfig } from './navigation.config';

interface SidebarSectionProps {
  section: SidebarSectionConfig;
  currentPath: string;
  /** Contagens de badge por id de item (ex.: { chat: 3 }). */
  badges?: Record<string, number>;
}

/**
 * Agrupa itens de um mesmo domínio de negócio (UI-001 — Seções).
 *
 * Rótulo: 13px, `muted-foreground`, caixa normal (como os títulos de grupo do WhatsApp).
 * Colapsado: divisor fino substitui o rótulo.
 */
export const SidebarSection: React.FC<SidebarSectionProps> = ({ section, currentPath, badges }) => {
  const { open, animate } = useSidebar();
  const showLabel = !animate || open;

  return (
    <div className="flex flex-col gap-0.5">
      {showLabel ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-1 pt-3 text-[13px] text-muted-foreground"
        >
          {section.title}
        </motion.p>
      ) : (
        <div className="mx-2 my-2 h-px bg-sidebar-border" aria-hidden="true" />
      )}

      <nav className="flex flex-col gap-0.5" aria-label={section.title}>
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={currentPath === item.href}
            badgeCount={badges?.[item.id]}
          />
        ))}
      </nav>
    </div>
  );
};
