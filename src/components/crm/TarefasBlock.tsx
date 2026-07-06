import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, X, Check, UserCircle, CalendarClock } from 'lucide-react';
import { ContactTask, TeamMember } from '@/types';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TarefasBlockProps {
  contactId: string;
  teamMembers: TeamMember[];
}

/**
 * Real tasks (public.tasks) for one contact, each optionally assigned to an
 * attendant. The assignee dropdown is fed by team_members, so a newly-
 * registered attendant shows up here automatically. Requires the tasks table
 * (supabase/create_tasks_table.sql).
 */
export const TarefasBlock: React.FC<TarefasBlockProps> = ({ contactId, teamMembers }) => {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    try {
      setTasks(await api.fetchTasksByContact(contactId));
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Descreva a tarefa'); return; }
    setSaving(true);
    try {
      await api.createTask({ title: title.trim(), contactId, assigneeId: assigneeId || null, dueDate: dueDate || null });
      toast.success('Tarefa criada');
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar tarefa');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (task: ContactTask) => {
    const next = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t)); // optimistic
    try {
      await api.setTaskStatus(task.id, next);
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)); // revert
      toast.error('Erro ao atualizar tarefa');
    }
  };

  return (
    <div className="px-4 space-y-2">
      {formOpen ? (
        <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/50 outline-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="flex-1 min-w-0 bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none appearance-none"
            >
              <option value="">Sem responsável</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-[130px] bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none"
            />
          </div>
          {teamMembers.length === 0 && (
            <p className="text-[10px] text-muted-foreground">Cadastre atendentes em Equipe para poder designar.</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary text-white text-xs font-medium py-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Criar tarefa
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-ring/50 hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Designar tarefa
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-1">Nenhuma tarefa</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(task => (
            <div key={task.id} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5">
              <button
                onClick={() => toggle(task)}
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                  task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary',
                )}
                aria-label={task.status === 'done' ? 'Reabrir tarefa' : 'Concluir tarefa'}
              >
                {task.status === 'done' && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-xs font-medium leading-snug', task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground')}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  {task.assigneeName && (
                    <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{task.assigneeName}</span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
