import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Loader2, X, Check, Edit2, Users, Settings, Trash2, KeyRound, ShieldPlus } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { TeamMember, type Team as TeamType } from '../types';
import { supabase } from '@/integrations/supabase/client';
import TeamConfigModal from './TeamConfigModal';
import TeamAccountPasswordModal from './TeamAccountPasswordModal';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/layout';

const inputClass = 'w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground focus:ring-1 focus:ring-ring/50 focus:border-ring/50 outline-none transition-all placeholder:text-muted-foreground';
const selectClass = 'w-full bg-background border border-border rounded-lg p-2.5 text-sm text-foreground outline-none transition-all';
const inlineSelectClass = 'w-full max-w-[7.5rem] px-2 py-1.5 bg-background border border-border rounded-md text-sm text-foreground cursor-pointer hover:border-ring/50 transition-colors outline-none';

const Team: React.FC = () => {
  const { isAdmin, canManageUsers } = useCompanySettings();
  /** Managers can touch agent/manager rows; only admins can touch admin rows. */
  const canEditRow = (targetRole: string) => isAdmin || (canManageUsers && targetRole !== 'admin');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{ email: string; temporaryPassword: string; title: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'agent', team_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '', email: '', role: 'agent',
    status: 'invited' as 'active' | 'invited' | 'disabled',
    team_id: ''
  });

  useEffect(() => {
    loadAllData();
    const cleanup = setupRealtime();
    return cleanup;
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [membersData, teamsData] = await Promise.all([
        api.fetchTeam(),
        api.fetchTeams(),
      ]);
      setMembers(membersData);
      setTeams(teamsData as TeamType[]);
    } catch (error) {
      console.error('Erro ao carregar dados da equipe', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('team-members-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadAllData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const temporaryPassword = await api.createTeamAccount({
        name: formData.name, email: formData.email,
        role: formData.role as 'agent' | 'admin' | 'manager',
        team_id: formData.team_id || undefined,
      });
      setShowModal(false);
      setFormData({ name: '', email: '', role: 'agent', team_id: '' });
      await loadAllData();
      setPasswordModal({
        email: formData.email,
        temporaryPassword,
        title: 'Conta criada com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao criar conta do membro:', error);
      toast.error(error?.message || 'Erro ao criar conta. Verifique se o email já não está cadastrado.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCreateAccess = async (member: TeamMember) => {
    try {
      const temporaryPassword = await api.createTeamAccount({
        name: member.name,
        email: member.email,
        role: member.role,
        team_id: member.team_id || undefined,
      });
      await loadAllData();
      setPasswordModal({ email: member.email, temporaryPassword, title: 'Acesso criado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao criar acesso:', error);
      toast.error(error?.message || 'Erro ao criar acesso de login para este membro.');
    }
  };

  const handleResetPassword = async (member: TeamMember) => {
    if (!member.user_id) return;
    try {
      const temporaryPassword = await api.resetTeamAccountPassword(member.user_id);
      setPasswordModal({ email: member.email, temporaryPassword, title: 'Nova senha gerada' });
    } catch (error: any) {
      console.error('Erro ao gerar nova senha:', error);
      toast.error(error?.message || 'Erro ao gerar nova senha para este membro.');
    }
  };

  const handleUpdateMember = async (id: string, field: string, value: any) => {
    try {
      await api.updateTeamMember(id, { [field]: value });
      toast.success('Membro atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro ao atualizar membro');
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${name}?`)) return;
    try {
      await api.deleteTeamMember(id);
      toast.success('Membro removido com sucesso');
      await loadAllData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name, email: member.email, role: member.role,
      status: member.status, team_id: member.team_id || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      await api.updateTeamMember(editingMember.id, {
        name: editFormData.name, email: editFormData.email,
        role: editFormData.role as 'admin' | 'manager' | 'agent',
        status: editFormData.status,
        team_id: editFormData.team_id || null,
      });
      toast.success('Membro atualizado com sucesso!');
      setShowEditModal(false);
      setEditingMember(null);
      await loadAllData();
    } catch (error) {
      console.error('Erro ao editar membro:', error);
      toast.error('Erro ao editar membro');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">Ativo</span>;
      case 'invited':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">Pendente</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted border border-border text-muted-foreground">Inativo</span>;
    }
  };

  const filteredMembers = members.filter(m => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const teamName = teams.find(t => t.id === m.team_id)?.name || '';
    return (
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      teamName.toLowerCase().includes(term)
    );
  });

  const stats = {
    total:   members.length,
    admins:  members.filter(m => m.role === 'admin').length,
    members: members.filter(m => m.role !== 'admin').length,
    teams:   teams.length
  };

  const roleLabel = (role: string) => role === 'agent' ? 'Atendente' : role === 'manager' ? 'Gerente' : 'Admin';

  return (
    <PageContainer>
      <PageHeader
        title="Equipe"
        description="Gerencie usuários e times da organização."
        actions={
          <>
            <Button onClick={() => setShowConfigModal(true)} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
            {canManageUsers && (
              <Button onClick={() => setShowModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Usuário
              </Button>
            )}
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Usuários', value: loading ? '-' : stats.total },
          { label: 'Admins',            value: loading ? '-' : stats.admins },
          { label: 'Membros',           value: loading ? '-' : stats.members },
          { label: 'Times Ativos',      value: stats.teams },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, email ou time..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-96 pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-ring/50 outline-none placeholder:text-muted-foreground transition-all"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Usuários da Equipe</h3>
          <p className="text-sm text-muted-foreground mt-1">Gerencie roles e times dos usuários</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <span className="text-sm text-muted-foreground">Carregando dados...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum membro cadastrado ainda.</p>
            {canManageUsers && (
              <Button onClick={() => setShowModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Primeiro Membro
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuário</th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Status</th>
                  <th className="px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/40 transition-colors group">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground border border-border uppercase">
                          {member.name.substring(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      <span className="block text-sm text-muted-foreground truncate" title={member.email}>{member.email}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {canEditRow(member.role) ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateMember(member.id, 'role', e.target.value)}
                          className={inlineSelectClass}
                        >
                          <option value="agent">Atendente</option>
                          <option value="manager">Gerente</option>
                          {isAdmin && <option value="admin">Admin</option>}
                        </select>
                      ) : (
                        <span className="text-sm text-foreground">{roleLabel(member.role)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {canEditRow(member.role) ? (
                        <select
                          value={member.team_id || ''}
                          onChange={(e) => handleUpdateMember(member.id, 'team_id', e.target.value || null)}
                          className={inlineSelectClass}
                        >
                          <option value="">Sem time</option>
                          {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{teams.find(t => t.id === member.team_id)?.name || 'Sem time'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {canEditRow(member.role) && (
                          <>
                            {member.user_id ? (
                              <button
                                onClick={() => handleResetPassword(member)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Gerar nova senha"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCreateAccess(member)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Criar acesso de login"
                              >
                                <ShieldPlus className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditClick(member)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Editar membro"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors"
                              title="Excluir membro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Convidar para a Equipe</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-6 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <input required type="text" className={inputClass} placeholder="Ex: João da Silva"
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Corporativo</label>
                <input required type="email" className={inputClass} placeholder="colaborador@empresa.com"
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nível de Acesso</label>
                <div className="grid grid-cols-3 gap-2">
                  {(isAdmin ? ['agent', 'manager', 'admin'] : ['agent', 'manager']).map((role) => (
                    <div
                      key={role}
                      onClick={() => setFormData({...formData, role})}
                      className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${
                        formData.role === role
                          ? 'bg-muted border-border text-foreground shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">{roleLabel(role)}</div>
                      {formData.role === role && <div className="flex justify-center"><Check className="w-3 h-3" /></div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Time (opcional)</label>
                <select value={formData.team_id} onChange={(e) => setFormData({...formData, team_id: e.target.value})} className={selectClass}>
                  <option value="">Sem time</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1" disabled={isInviting}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={isInviting}>
                  {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Criar Conta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      <TeamConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onUpdate={loadAllData} />

      {/* Temporary Password Modal */}
      {passwordModal && (
        <TeamAccountPasswordModal
          title={passwordModal.title}
          email={passwordModal.email}
          temporaryPassword={passwordModal.temporaryPassword}
          onClose={() => setPasswordModal(null)}
        />
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">Editar Membro</h3>
              <button onClick={() => { setShowEditModal(false); setEditingMember(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <input required type="text" className={inputClass} value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input required type="email" className={inputClass} value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nível de Acesso</label>
                <div className="grid grid-cols-3 gap-2">
                  {(isAdmin ? ['agent', 'manager', 'admin'] : ['agent', 'manager']).map((role) => (
                    <div
                      key={role}
                      onClick={() => setEditFormData({...editFormData, role})}
                      className={`cursor-pointer rounded-lg border p-2 text-center transition-all ${
                        editFormData.role === role
                          ? 'bg-muted border-border text-foreground shadow-sm'
                          : 'bg-background border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="text-xs font-bold uppercase mb-1">{roleLabel(role)}</div>
                      {editFormData.role === role && <div className="flex justify-center"><Check className="w-3 h-3" /></div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <select value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value as 'active' | 'invited' | 'disabled'})}
                  className={selectClass}>
                  <option value="active">Ativo</option>
                  <option value="invited">Pendente</option>
                  <option value="disabled">Inativo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Time</label>
                <select value={editFormData.team_id} onChange={(e) => setEditFormData({...editFormData, team_id: e.target.value})} className={selectClass}>
                  <option value="">Sem time</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingMember(null); }} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar Alterações</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Team;
