import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Check, X, UsersRound, CloudOff } from 'lucide-react';
import { Button } from './Button';
import { api } from '../services/api';
import { Team } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface TeamConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DEFAULT_COLOR = '#3b82f6';
const bare = 'w-full bg-transparent py-1.5 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground';

type Draft = { name: string; description: string; color: string };

/** Inline editor for one team: colour swatch + underlined name/description. */
const TeamEditor: React.FC<{ draft: Draft; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void; saving: boolean }> = ({
  draft, onChange, onSave, onCancel, saving,
}) => (
  <div className="flex items-start gap-4 px-6 py-3 bg-accent/50">
    <label className="relative mt-1.5 w-8 h-8 rounded-full flex-shrink-0 cursor-pointer ring-2 ring-card" style={{ backgroundColor: draft.color }} title="Cor do time">
      <span className="sr-only">Cor do time</span>
      <input type="color" value={draft.color} onChange={(e) => onChange({ ...draft, color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
    </label>
    <div className="flex-1 min-w-0 space-y-2">
      <div className="border-b-2 border-border focus-within:border-primary transition-colors">
        <input
          autoFocus
          aria-label="Nome do time"
          placeholder="Nome do time"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
          className={bare}
        />
      </div>
      <div className="border-b-2 border-border focus-within:border-primary transition-colors">
        <input
          aria-label="Descrição"
          placeholder="Descrição (opcional)"
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
          className={`${bare} text-sm`}
        />
      </div>
    </div>
    <div className="flex items-center gap-1 mt-1">
      <button type="button" onClick={onSave} disabled={saving || !draft.name.trim()} aria-label="Salvar" className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-accent disabled:opacity-40">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
      </button>
      <button type="button" onClick={onCancel} disabled={saving} aria-label="Cancelar" className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent">
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
);

const TeamConfigModal: React.FC<TeamConfigModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', description: '', color: DEFAULT_COLOR });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
    const channel = supabase
      .channel('teams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen]);

  const loadData = async () => {
    try {
      const teamsData = await api.fetchTeams();
      setTeams(teamsData as Team[]);
      setFailed(false);
    } catch (error) {
      console.error('Error loading teams:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => { setDraft({ name: '', description: '', color: DEFAULT_COLOR }); setEditingId('new'); };
  const startEdit = (team: Team) => { setDraft({ name: team.name, description: team.description || '', color: team.color }); setEditingId(team.id); };
  const cancel = () => setEditingId(null);

  const save = async () => {
    if (!draft.name.trim() || !editingId) return;
    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), description: draft.description, color: draft.color };
      if (editingId === 'new') await api.createTeam(payload);
      else await api.updateTeam(editingId, payload);
      setEditingId(null);
      await loadData();
      onUpdate();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Não foi possível salvar o time.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteTeam(confirmDelete.id);
      setConfirmDelete(null);
      await loadData();
      onUpdate();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Não foi possível excluir o time.');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex flex-col max-h-[80vh]">
            <div className="px-6 pt-6 pb-3 flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-normal text-foreground">Times</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Agrupe a equipe por área. A cor aparece ao lado do nome do time na lista.
                </DialogDescription>
              </div>
            </div>

            <div className="overflow-y-auto min-h-0 pb-2">
              {editingId === 'new' ? (
                <TeamEditor draft={draft} onChange={setDraft} onSave={save} onCancel={cancel} saving={saving} />
              ) : (
                <button
                  type="button"
                  onClick={startNew}
                  className="w-full flex items-center gap-4 px-6 py-3 text-left hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0"
                >
                  <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-[17px] text-foreground">Novo time</span>
                </button>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
                </div>
              ) : failed ? (
                <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
                  <CloudOff className="w-8 h-8 text-icon/40" aria-hidden="true" />
                  <p className="text-[15px] text-foreground">Não foi possível carregar os times</p>
                </div>
              ) : teams.length === 0 && editingId !== 'new' ? (
                <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
                  <UsersRound className="w-8 h-8 text-icon/40" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Nenhum time criado. Quem não tem time aparece em "Sem time".</p>
                </div>
              ) : (
                <ul>
                  {teams.map((team) => editingId === team.id ? (
                    <li key={team.id}>
                      <TeamEditor draft={draft} onChange={setDraft} onSave={save} onCancel={cancel} saving={saving} />
                    </li>
                  ) : (
                    <li key={team.id} className="group/li flex items-center gap-4 pl-6 pr-3">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary" aria-hidden="true">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: team.color }} />
                      </span>
                      <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[17px] leading-[21px] text-foreground truncate">{team.name}</p>
                          {team.description && <p className="mt-0.5 text-sm text-muted-foreground truncate">{team.description}</p>}
                        </div>
                        <button type="button" onClick={() => startEdit(team)} aria-label={`Editar ${team.name}`} className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(team)} aria-label={`Excluir ${team.name}`} className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent hover:text-danger">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-6 py-4 flex justify-end border-t border-border">
              <Button onClick={onClose} variant="ghost">Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o time {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-danger text-white hover:bg-danger/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamConfigModal;
