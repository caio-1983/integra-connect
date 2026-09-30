import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import type { Team, TeamMember } from '@/types';
import { cn } from '@/lib/utils';
import { ROLE_LABEL, STATUS_LABEL } from './teamLabels';

export interface MemberFormValues {
  name: string;
  email: string;
  role: TeamMember['role'];
  status: TeamMember['status'];
  team_id: string;
}

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'invite' | 'edit';
  initial: MemberFormValues;
  teams: Team[];
  /** Only admins can hand out (or edit) the admin role. */
  allowAdmin: boolean;
  onSubmit: (values: MemberFormValues) => Promise<void>;
}

// Same field grammar as the Agenda form: underlined, green label.
const line = 'border-b-2 border-border focus-within:border-primary transition-colors';
const bare = 'w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground';
const label = 'text-sm text-primary';

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    onClick={onClick}
    className={cn(
      'px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
      active ? 'bg-primary-subtle text-primary-subtle-foreground font-medium' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
    )}
  >
    {children}
  </button>
);

const ROLE_HINT: Record<TeamMember['role'], string> = {
  agent: 'Atende as conversas dos números a que tem acesso.',
  manager: 'Também gerencia a equipe e os acessos, menos administradores.',
  admin: 'Acesso total, inclusive às configurações da empresa.',
};

export const MemberFormDialog: React.FC<MemberFormDialogProps> = ({
  open, onOpenChange, mode, initial, teams, allowAdmin, onSubmit,
}) => {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setV(initial); }, [open, initial]);

  const set = <K extends keyof MemberFormValues>(k: K, val: MemberFormValues[K]) => setV(prev => ({ ...prev, [k]: val }));
  const roles: TeamMember['role'][] = allowAdmin ? ['agent', 'manager', 'admin'] : ['agent', 'manager'];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(v); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <form onSubmit={submit} className="flex flex-col max-h-[88vh]">
          <div className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-normal text-foreground">
              {mode === 'invite' ? 'Adicionar pessoa' : 'Editar pessoa'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {mode === 'invite'
                ? 'A conta é criada na hora, com uma senha temporária para você repassar.'
                : 'Nome, e-mail, função e time desta pessoa.'}
            </DialogDescription>
          </div>

          <div className="px-6 py-3 space-y-5 overflow-y-auto">
            <div>
              <label htmlFor="mb-name" className={label}>Nome</label>
              <div className={line}>
                <input id="mb-name" required autoFocus value={v.name} onChange={e => set('name', e.target.value)} placeholder="Ex.: João da Silva" className={bare} />
              </div>
            </div>

            <div>
              <label htmlFor="mb-email" className={label}>E-mail de login</label>
              <div className={line}>
                <input id="mb-email" required type="email" value={v.email} onChange={e => set('email', e.target.value)} placeholder="joao@empresa.com.br" className={bare} />
              </div>
            </div>

            <div>
              <span className={label} id="mb-role">Função</span>
              <div role="radiogroup" aria-labelledby="mb-role" className="mt-2 flex flex-wrap gap-1.5">
                {roles.map(r => <Chip key={r} active={v.role === r} onClick={() => set('role', r)}>{ROLE_LABEL[r]}</Chip>)}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{ROLE_HINT[v.role]}</p>
            </div>

            <div>
              <span className={label} id="mb-team">Time</span>
              <div role="radiogroup" aria-labelledby="mb-team" className="mt-2 flex flex-wrap gap-1.5">
                <Chip active={!v.team_id} onClick={() => set('team_id', '')}>Sem time</Chip>
                {teams.map(t => <Chip key={t.id} active={v.team_id === t.id} onClick={() => set('team_id', t.id)}>{t.name}</Chip>)}
              </div>
            </div>

            {mode === 'edit' && (
              <div>
                <span className={label} id="mb-status">Situação</span>
                <div role="radiogroup" aria-labelledby="mb-status" className="mt-2 flex flex-wrap gap-1.5">
                  {(['active', 'invited', 'disabled'] as const).map(s => (
                    <Chip key={s} active={v.status === s} onClick={() => set('status', s)}>{STATUS_LABEL[s]}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !v.name.trim() || !v.email.trim()} className="min-w-28">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Salvando" /> : mode === 'invite' ? 'Criar conta' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
