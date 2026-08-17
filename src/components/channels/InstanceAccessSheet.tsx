import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import type { TeamMember } from '@/types';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';

interface InstanceAccessSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
  grantedUserIds: Set<string>;
  /** Re-fetches the shared grants map after a grant/revoke. */
  onChanged: () => void;
}

const ROLE_LABEL: Record<TeamMember['role'], string> = {
  admin: 'Admin',
  manager: 'Gestor',
  agent: 'Atendente',
};

/**
 * Per-instance access control (checklist of users), opened from a
 * WhatsAppInstanceCard's "Acesso" button. Managers and agents only see the
 * numbers checked here; admins bypass the check entirely (migration
 * 20260810110000) so a newly connected number is never invisible to everyone —
 * the failure mode that hid a whole number during the first production trial.
 * Toggling calls the grant/revoke API immediately (same "call on change, toast
 * on error" convention as Team.tsx).
 *
 * A manager operator can only toggle agent rows: the RLS write policy scopes
 * managers to agent targets, so admin/manager rows are shown read-only for
 * non-admin operators (only an admin assigns numbers to admins/managers).
 */
export const InstanceAccessSheet: React.FC<InstanceAccessSheetProps> = ({
  open, onOpenChange, instanceName, grantedUserIds, onChanged,
}) => {
  const { isAdmin } = useCompanySettings();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.fetchTeam()
      .then((all) => setMembers(all.filter((m) => !!m.user_id)))
      .finally(() => setLoading(false));
  }, [open]);

  const handleToggle = async (userId: string, hasAccess: boolean) => {
    setPendingUserId(userId);
    try {
      if (hasAccess) {
        await api.revokeInstanceAccess(instanceName, userId);
      } else {
        await api.grantInstanceAccess(instanceName, userId);
      }
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar acesso.');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Acesso a "{instanceName}"</SheetTitle>
          <SheetDescription>
            Marque quais usuários podem ver e responder conversas deste número. Gestores e atendentes só enxergam os números marcados aqui; admins veem todos os números, com ou sem marcação.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários…
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">Nenhum usuário com conta de login cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {members.map((member) => {
                const hasAccess = grantedUserIds.has(member.user_id!);
                const isPending = pendingUserId === member.user_id;
                // Managers may only manage agent grants (RLS). Non-admin
                // operators see admin/manager rows read-only.
                const editable = isAdmin || member.role === 'agent';
                return (
                  <label
                    key={member.id}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-sm ${
                      editable ? 'hover:bg-muted cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasAccess}
                      disabled={isPending || !editable}
                      onChange={() => handleToggle(member.user_id!, hasAccess)}
                      className="h-4 w-4 rounded border-border disabled:cursor-not-allowed"
                    />
                    <span className="flex-1 text-foreground truncate">{member.name}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                      {ROLE_LABEL[member.role]}
                    </span>
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
