import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const ROLE_LABEL: Record<'admin' | 'manager' | 'agent', string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  agent: 'Atendente',
};

/**
 * Rodapé da Sidebar — identidade do usuário autenticado (UI-001).
 *
 * Exibe: avatar, nome, cargo e chevron. Clicar abre um menu (Nome + e-mail,
 * Mudar senha, Sair) em vez de deslogar direto — o chevron já sinalizava
 * esse menu futuro.
 */
export const SidebarFooter: React.FC = () => {
  const { open } = useSidebar();
  const { user, signOut } = useAuth();
  const { role } = useCompanySettings();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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

  const getRole = (): string => (role ? ROLE_LABEL[role] : 'Colaborador');

  return (
    <div className="flex flex-col gap-1.5">
      {/* Separador */}
      <div className="border-t border-slate-100" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Conta"
            aria-label="Abrir menu da conta"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 data-[state=open]:bg-slate-50"
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

                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          className="w-64 rounded-xl border-slate-200 bg-white p-1.5 text-slate-800 shadow-lg"
        >
          <DropdownMenuLabel className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium leading-tight text-slate-800">{getDisplayName()}</p>
            <p className="truncate text-[11px] leading-tight text-slate-400">{user?.email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-slate-100" />

          <DropdownMenuItem
            onSelect={() => setChangePasswordOpen(true)}
            className="text-slate-700 focus:bg-slate-50 focus:text-slate-900"
          >
            <KeyRound className="h-4 w-4 text-slate-400" />
            Mudar senha
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-slate-100" />

          <DropdownMenuItem
            onSelect={handleLogout}
            className="text-slate-700 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
};
