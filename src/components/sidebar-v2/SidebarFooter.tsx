import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Rodapé da Sidebar — identidade do usuário autenticado (UI-001).
 *
 * Exibe: avatar, nome, cargo e chevron.
 * Não exibe e-mail. Initials derivadas do nome completo.
 *
 * O chevron sinaliza menu futuro (Perfil, Preferências, Ajuda, Sair).
 * Por ora o clique na linha do usuário executa logout.
 *
 * A lógica de autenticação é preservada: usa o mesmo `signOut` do hook.
 */
export const SidebarFooter: React.FC = () => {
  const { open } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin } = useCompanySettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso');
      navigate('/auth', { replace: true });
    } catch {
      toast.error('Erro ao fazer logout');
    }
  };

  const getUserInitials = (): string => {
    const name = user?.user_metadata?.full_name as string | undefined;
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  const getDisplayName = (): string => {
    return (user?.user_metadata?.full_name as string | undefined) || 'Usuário';
  };

  const getRole = (): string => {
    return isAdmin ? 'Administrador' : 'Colaborador';
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Separador */}
      <div className="border-t border-slate-100" />

      {/* Linha do usuário — avatar, nome, cargo, chevron */}
      <button
        type="button"
        onClick={handleLogout}
        title="Sair"
        aria-label="Sair da conta"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-700">
          {getUserInitials()}
        </div>

        {open && (
          <>
            {/* Nome + Cargo */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-medium leading-tight text-slate-800">
                {getDisplayName()}
              </p>
              <p className="text-[11px] leading-tight text-slate-400">
                {getRole()}
              </p>
            </div>

            {/* Chevron — indica menu futuro */}
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
          </>
        )}
      </button>
    </div>
  );
};
