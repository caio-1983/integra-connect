import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
import { NotificationBell } from '@/components/notifications/NotificationBell';

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
  const [memberName, setMemberName] = useState<string | null>(null);

  // team_members.name is what admins edit in /team; user_metadata.full_name is
  // frozen at account creation, so a renamed member kept showing the old name.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('team_members')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMemberName(data?.name?.trim() || null);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const fullName = memberName || (user?.user_metadata?.full_name as string | undefined);

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
    const name = fullName;
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
    return fullName || 'Usuário';
  };

  const getRole = (): string => (role ? ROLE_LABEL[role] : 'Colaborador');

  return (
    <div className="flex flex-col gap-1.5">
      {/* Separador */}
      <div className="border-t border-sidebar-border" />

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Conta"
            aria-label="Abrir menu da conta"
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:ring-offset-0 data-[state=open]:bg-sidebar-accent"
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-avatar text-xs font-semibold text-avatar-foreground">
              {getUserInitials()}
            </div>

            {open && (
              <>
                {/* Nome + Cargo */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm leading-tight text-foreground">
                    {getDisplayName()}
                  </p>
                  <p className="mt-0.5 text-xs leading-tight text-muted-foreground">
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
          className="w-64"
        >
          <DropdownMenuLabel className="px-2.5 py-2">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">{getDisplayName()}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onSelect={() => setChangePasswordOpen(true)}
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Mudar senha
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border" />

          <DropdownMenuItem
            onSelect={handleLogout}
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
