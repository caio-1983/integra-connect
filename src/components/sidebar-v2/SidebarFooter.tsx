import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Rodapé da Sidebar — identidade do usuário autenticado.
 *
 * Exibe: assinatura da plataforma, avatar, nome e cargo.
 * O chevron sinaliza um menu futuro (Perfil, Preferências, Ajuda, Sair).
 * Por ora apenas o logout permanece funcional via botão dedicado.
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
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'US';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.user_metadata?.full_name || 'Usuário';
  };

  const getRole = () => {
    return isAdmin ? 'Administrador' : 'Colaborador';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Assinatura da plataforma — discreta, baixo contraste */}
      {open && (
        <p className="text-center text-[10px] font-medium text-slate-300">
          Powered by Integra Connect
        </p>
      )}

      <div className="border-t border-slate-100 pt-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50">
          {/* Avatar */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
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

              {/* Ações — logout funcional; chevron prepara menu futuro */}
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair"
                  aria-label="Sair"
                  className="rounded-md p-1 text-slate-300 transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-slate-200" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
