import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import type { TeamMember } from '@/types';
import { toast } from 'sonner';

interface InstanceAccessSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
  grantedUserIds: Set<string>;
  /** Re-fetches the shared grants map after a grant/revoke. */
  onChanged: () => void;
}

/**
 * Per-instance access control (checklist of agents), opened from a
 * WhatsAppInstanceCard's "Acesso" button. Toggling calls the grant/revoke API
 * immediately — same "call on change, toast on error" convention as Team.tsx.
 */
export const InstanceAccessSheet: React.FC<InstanceAccessSheetProps> = ({
  open, onOpenChange, instanceName, grantedUserIds, onChanged,
}) => {
  const [agents, setAgents] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.fetchTeam()
      .then((members) => setAgents(members.filter((m) => m.role === 'agent' && !!m.user_id)))
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
            Marque quais atendentes podem ver e responder conversas deste número. Admins e gestores sempre têm acesso, sem precisar marcar aqui.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando atendentes…
            </div>
          ) : agents.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-2">Nenhum atendente com conta de login cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {agents.map((agent) => {
                const hasAccess = grantedUserIds.has(agent.user_id!);
                const isPending = pendingUserId === agent.user_id;
                return (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={hasAccess}
                      disabled={isPending}
                      onChange={() => handleToggle(agent.user_id!, hasAccess)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="flex-1 text-foreground">{agent.name}</span>
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
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
