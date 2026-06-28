import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Cabeçalho da Sidebar — identidade do produto Integra Connect (UI-001).
 *
 * Hierarquia visual (expandido):
 *   1. Logo do cliente        — centralizada, ~40% maior
 *   2. Integra Connect        — nome do produto
 *   3. Plataforma Omnichannel — subtítulo
 *   ── separador ──
 */
export const SidebarHeader: React.FC = () => {
  const { open } = useSidebar();

  return (
    <div className="flex flex-col">
      {/* Logo — centralizada, tamanho aumentado */}
      <Link
        to="/dashboard"
        className={cn(
          'flex items-center justify-center py-2 rounded-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30',
        )}
      >
        <img
          src="/logo-lumina-sidebar.png"
          alt="Integra Connect"
          className="h-16 w-full object-contain object-center transition-all"
        />
      </Link>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex flex-col gap-2"
        >
          {/* Identidade do produto */}
          <div className="flex flex-col items-center gap-0.5 px-2 text-center">
            <span className="text-[13px] font-semibold leading-tight text-slate-800">
              Integra Connect
            </span>
            <span className="text-[11px] leading-tight text-slate-400">
              Plataforma Omnichannel
            </span>
          </div>

          {/* Divisor inferior — separa Header da Navegação */}
          <div className="mx-2 h-px bg-slate-100" aria-hidden="true" />
        </motion.div>
      )}

      {/* Divisor quando colapsado */}
      {!open && <div className="mx-2 mt-2 h-px bg-slate-100" aria-hidden="true" />}
    </div>
  );
};
