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
      <div className="border-t border-sidebar-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Conta"
            aria-label="Abrir menu da conta"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 data-[state=open]:bg-sidebar-accent"
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
              {getUserInitials()}
            </div>

            {open && (
              <>
                {/* Nome + Cargo */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                    {getDisplayName()}
                  </p>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {getRole()}
                  </p>
                </div>

                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          className="w-64 rounded-xl border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <DropdownMenuLabel className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">{getDisplayName()}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onSelect={() => setChangePasswordOpen(true)}
            className="text-foreground focus:bg-muted focus:text-foreground"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Mudar senha
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onSelect={handleLogout}
            className="text-foreground focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
};
