import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useCompanySettings } from '@/hooks/useCompanySettings';

/**
 * Cabeçalho da Sidebar — identidade do produto Integra Connect.
 *
 * Hierarquia visual (expandido):
 *   1. LOGO            — elemento visual principal, ~35% maior
 *   2. Integra Connect — rótulo do produto, discreto
 *   ── separador ──
 *   3. Empresa         — rótulo de contexto, muito discreto
 *   4. Nome da empresa — com ChevronsUpDown (Company Switcher futuro)
 *
 * O produto é o protagonista; a empresa é o contexto operacional.
 * Company Switcher: preparado visualmente, não implementado.
 */
export const SidebarHeader: React.FC = () => {
  const { open } = useSidebar();
  const { companyName } = useCompanySettings();

  return (
    <div className="flex flex-col gap-3">
      {/* Logo — elemento visual principal */}
      <Link
        to="/dashboard"
        className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <img
          src="/logo-lumina-sidebar.png"
          alt="Integra Connect"
          className={cn(
            'h-12 w-full object-contain transition-all',
            open ? 'object-left' : 'object-center',
          )}
        />
      </Link>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex flex-col gap-2"
        >
          {/* Produto */}
          <span className="px-2 text-[11px] font-medium text-slate-400">
            Integra Connect
          </span>

          {/* Separação visual produto / empresa */}
          <div className="h-px bg-slate-100" aria-hidden="true" />

          {/* Contexto operacional — Company Switcher preparado visualmente */}
          <div className="flex flex-col gap-0.5">
            <span className="px-2 text-[10px] font-medium text-slate-400">
              Empresa
            </span>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Empresa atual"
            >
              <span className="truncate text-[13px] font-semibold text-slate-800">
                {companyName || 'Minha Empresa'}
              </span>
              <ChevronsUpDown className="ml-2 h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
