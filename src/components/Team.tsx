import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Search, Loader2, Users, UsersRound, Pencil, Trash2, KeyRound, ShieldPlus, MoreVertical, CloudOff } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { TeamMember, type Team as TeamType } from '../types';
import { supabase } from '@/integrations/supabase/client';
import TeamConfigModal from './TeamConfigModal';
import TeamAccountPasswordModal from './TeamAccountPasswordModal';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/layout';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MemberFormDialog, type MemberFormValues } from '@/components/team/MemberFormDialog';
import { ROLE_LABEL, STATUS_LABEL } from '@/components/team/teamLabels';
import { cn } from '@/lib/utils';

type RoleFilter = 'all' | TeamMember['role'];

const EMPTY_FORM: MemberFormValues = { name: '', email: '', role: 'agent', status: 'active', team_id: '' };

/** api.fetchTeam fills missing avatars with ui-avatars; our own initials read better. */
const realAvatar = (url?: string) => (url && !url.includes('ui-avatars.com') ? url : undefined);

const Team: React.FC = () => {
  const { isAdmin, canManageUsers } = useCompanySettings();
  /** Managers can touch agent/manager rows; only admins can touch admin rows. */
  const canEditRow = (targetRole: string) => isAdmin || (canManageUsers && targetRole !== 'admin');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ email: string; temporaryPassword: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [form, setForm] = useState<{ mode: 'invite' | 'edit'; member?: TeamMember; initial: MemberFormValues } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    const channel = supabase
      .channel('team-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => { loadAllData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAllData = async () => {
    try {
      const [membersData, teamsData] = await Promise.all([api.fetchTeam(), api.fetchTeams()]);
      setMembers(membersData);
      setTeams(teamsData as TeamType[]);
      setFailed(false);
    } catch (error) {
      console.error('Erro ao carregar dados da equipe', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const openInvite = () => setForm({ mode: 'invite', initial: EMPTY_FORM });
  const openEdit = (member: TeamMember) => setForm({
    mode: 'edit',
    member,
    initial: { name: member.name, email: member.email, role: member.role, status: member.status, team_id: member.team_id || '' },
  });

  const submitForm = async (v: MemberFormValues) => {
    if (!form) return;
    try {
      if (form.mode === 'invite') {
        const temporaryPassword = await api.createTeamAccount({
          name: v.name, email: v.email, role: v.role, team_id: v.team_id || undefined,
        });
        setForm(null);
        await loadAllData();
        setPasswordModal({ email: v.email, temporaryPassword, title: 'Conta criada' });
      } else if (form.member) {
        await api.updateTeamMember(form.member.id, {
          name: v.name, email: v.email, role: v.role, status: v.status, team_id: v.team_id || null,
        });
        toast.success('Alterações salvas');
        setForm(null);
        await loadAllData();
      }
    } catch (error: any) {
      console.error('Erro ao salvar membro:', error);
      toast.error(error?.message || (form.mode === 'invite'
        ? 'Não foi possível criar a conta. Confira se o e-mail já não está cadastrado.'
        : 'Não foi possível salvar as alterações.'));
    }
  };

  const handleCreateAccess = async (member: TeamMember) => {
    setBusyId(member.id);
    try {
      const temporaryPassword = await api.createTeamAccount({
        name: member.name, email: member.email, role: member.role, team_id: member.team_id || undefined,
      });
      await loadAllData();
      setPasswordModal({ email: member.email, temporaryPassword, title: 'Acesso criado' });
    } catch (error: any) {
      console.error('Erro ao criar acesso:', error);
      toast.error(error?.message || 'Não foi possível criar o acesso de login.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.user_id) return;
    setBusyId(member.id);
    try {
      const temporaryPassword = await api.resetTeamAccountPassword(member.user_id);
      setPasswordModal({ email: member.email, temporaryPassword, title: 'Nova senha gerada' });
    } catch (error: any) {
      console.error('Erro ao gerar nova senha:', error);
      toast.error(error?.message || 'Não foi possível gerar uma nova senha.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteTeamMember(confirmDelete.id);
      toast.success(`${confirmDelete.name} saiu da equipe`);
      setConfirmDelete(null);
      await loadAllData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Não foi possível remover da equipe.');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => ({
    admin: members.filter(m => m.role === 'admin').length,
    manager: members.filter(m => m.role === 'manager').length,
    agent: members.filter(m => m.role === 'agent').length,
  }), [members]);

  // Grouped by team, like the sections of WhatsApp's contact list; "Sem time" last.
  const groups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const teamName = (id?: string | null) => teams.find(t => t.id === id)?.name || '';
    const visible = members
      .filter(m => roleFilter === 'all' || m.role === roleFilter)
      .filter(m => !term
        || m.name.toLowerCase().includes(term)
        || m.email.toLowerCase().includes(term)
        || teamName(m.team_id).toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const out: Array<{ key: string; team?: TeamType; items: TeamMember[] }> = teams
      .map(team => ({ key: team.id, team, items: visible.filter(m => m.team_id === team.id) }))
      .filter(g => g.items.length > 0);
    const loose = visible.filter(m => !m.team_id || !teams.some(t => t.id === m.team_id));
    if (loose.length) out.push({ key: 'none', items: loose });
    return { list: out, total: visible.length };
  }, [members, teams, searchTerm, roleFilter]);

  const chip = (value: RoleFilter, label: string, count?: number) => (
    <button
      type="button"
      aria-pressed={roleFilter === value}
      onClick={() => setRoleFilter(value)}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
        roleFilter === value
          ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
          : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && (
        <span className="text-xs tabular-nums opacity-70">{count}</span>
      )}
    </button>
  );

  const renderMember = (member: TeamMember) => {
    const editable = canEditRow(member.role);
    return (
      <li key={member.id} className="group/li flex items-center gap-3 pl-3 pr-2">
        <ContactAvatar src={realAvatar(member.avatar)} name={member.name} className="w-[49px] h-[49px] text-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => editable && openEdit(member)}
            disabled={!editable}
            className="flex-1 min-w-0 text-left rounded-sm disabled:cursor-default"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-[17px] leading-[21px] text-foreground truncate">{member.name}</span>
              {member.role !== 'agent' && (
                <span className={cn(
                  'flex-shrink-0 px-1.5 h-[18px] rounded-full text-[11px] font-medium flex items-center',
                  member.role === 'admin' ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-secondary text-secondary-foreground',
                )}>
                  {ROLE_LABEL[member.role]}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground truncate">
              {member.status !== 'active' && (
                <span className={member.status === 'invited' ? 'text-warning' : undefined}>{STATUS_LABEL[member.status]} · </span>
              )}
              {!member.user_id && <span className="text-warning">Sem login · </span>}
              {member.email}
            </span>
          </button>

          {editable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Ações de ${member.name}`}
                  disabled={busyId === member.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-icon hover:bg-accent flex-shrink-0 disabled:opacity-50"
                >
                  {busyId === member.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <MoreVertical className="w-5 h-5" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onSelect={() => openEdit(member)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                {member.user_id ? (
                  <DropdownMenuItem onSelect={() => handleResetPassword(member)}>
                    <KeyRound className="w-4 h-4 mr-2" /> Gerar nova senha
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => handleCreateAccess(member)}>
                    <ShieldPlus className="w-4 h-4 mr-2" /> Criar acesso de login
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setConfirmDelete(member)} className="text-danger focus:text-danger">
                  <Trash2 className="w-4 h-4 mr-2" /> Remover da equipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </li>
    );
  };

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <PageContainer>
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        <PageHeader
          title="Equipe"
          description={loading ? 'Carregando…' : failed ? 'Não foi possível carregar a equipe' : `${plural(members.length, 'pessoa', 'pessoas')} · ${plural(teams.length, 'time', 'times')}`}
          actions={
            <>
              <Button onClick={() => setShowConfigModal(true)} variant="outline">
                <UsersRound className="w-4 h-4 mr-2" aria-hidden="true" />
                Times
              </Button>
              {canManageUsers && (
                <Button onClick={openInvite}>
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Adicionar pessoa
                </Button>
              )}
            </>
          }
        />

        <div className="w-full rounded-lg bg-card border border-border overflow-hidden flex flex-col min-h-[400px]">
          <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                aria-label="Pesquisar na equipe"
                placeholder="Pesquisar nome, e-mail ou time"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-10 bg-secondary border-0 rounded-full text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {chip('all', 'Todos')}
              {chip('admin', 'Administradores', counts.admin)}
              {chip('manager', 'Gestores', counts.manager)}
              {chip('agent', 'Atendentes', counts.agent)}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">Carregando equipe…</span>
            </div>
          ) : failed ? (
            <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
              <CloudOff className="w-10 h-10 text-icon/40" aria-hidden="true" />
              <p className="text-base text-foreground">Não foi possível carregar a equipe</p>
              <p className="text-sm text-muted-foreground">Recarregue a página para tentar de novo.</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 px-6 text-center">
              <Users className="w-10 h-10 text-icon/40" aria-hidden="true" />
              <p className="text-base text-foreground">Ninguém na equipe ainda</p>
              {canManageUsers && (
                <Button onClick={openInvite}>
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" /> Adicionar pessoa
                </Button>
              )}
            </div>
          ) : groups.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
              <Search className="w-10 h-10 text-icon/40" aria-hidden="true" />
              <p className="text-base text-foreground">Ninguém encontrado</p>
              <p className="text-sm text-muted-foreground">Tente outro termo ou troque o filtro.</p>
            </div>
          ) : (
            <div>
              {groups.list.map(({ key, team, items }) => (
                <section key={key} aria-label={team?.name ?? 'Sem time'}>
                  <h3 className="px-6 pt-5 pb-2 flex items-center gap-2 text-base text-primary">
                    {team && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} aria-hidden="true" />}
                    {team?.name ?? 'Sem time'}
                    <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
                  </h3>
                  <ul>{items.map(renderMember)}</ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <MemberFormDialog
        open={!!form}
        onOpenChange={(o) => { if (!o) setForm(null); }}
        mode={form?.mode ?? 'invite'}
        initial={form?.initial ?? EMPTY_FORM}
        teams={teams}
        allowAdmin={isAdmin}
        onSubmit={submitForm}
      />

      <TeamConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onUpdate={loadAllData} />

      {passwordModal && (
        <TeamAccountPasswordModal
          title={passwordModal.title}
          email={passwordModal.email}
          temporaryPassword={passwordModal.temporaryPassword}
          onClose={() => setPasswordModal(null)}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o && !deleting) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {confirmDelete?.name} da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Não dá para desfazer. Se for só uma pausa, edite a pessoa e marque a situação como Inativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={deleting} className="bg-danger text-white hover:bg-danger/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default Team;
