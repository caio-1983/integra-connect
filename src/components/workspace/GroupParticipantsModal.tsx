import React, { useEffect, useState } from 'react';
import { Loader2, Search, ShieldCheck, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchGroupParticipants, type GroupParticipant } from '@/services/whatsappConnectionService';

interface GroupParticipantsModalProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPhone(phone: string): string {
  const match = phone.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (!match) return `+${phone}`;
  return `+55 ${match[1]} ${match[2]}-${match[3]}`;
}

export const GroupParticipantsModal: React.FC<GroupParticipantsModalProps> = ({ conversationId, open, onOpenChange }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSearch('');
    fetchGroupParticipants(conversationId)
      .then((result) => setParticipants(result.participants))
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar participantes'))
      .finally(() => setLoading(false));
  }, [open, conversationId]);

  const filteredParticipants = participants.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (p.name?.toLowerCase() || '').includes(q) || p.phoneNumber.includes(q.replace(/\D/g, '') || q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Participantes do Grupo</DialogTitle>
          <DialogDescription>
            {participants.length > 0 ? `${participants.length} participante${participants.length !== 1 ? 's' : ''}` : 'Membros deste grupo no WhatsApp'}
          </DialogDescription>
        </DialogHeader>

        {!loading && !error && participants.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="max-h-96 overflow-y-auto rounded-lg border border-border divide-y divide-border/60">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive px-4">{error}</p>
          ) : participants.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum participante encontrado</p>
          ) : filteredParticipants.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum resultado para "{search}"</p>
          ) : (
            filteredParticipants.map((p) => (
              <div key={p.phoneNumber} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{p.name || formatPhone(p.phoneNumber)}</div>
                  {p.name && <div className="text-xs text-muted-foreground">{formatPhone(p.phoneNumber)}</div>}
                </div>
                {p.isAdmin && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 flex-shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
