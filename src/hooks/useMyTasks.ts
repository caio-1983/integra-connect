import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/services/api';
import type { MyTask } from '@/types';

export type TaskDueKind = 'late' | 'today' | 'later' | 'none';

/** Local calendar day as YYYY-MM-DD, the same shape as `tasks.due_date`. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function taskDue(dueDate: string | undefined, now = new Date()): { kind: TaskDueKind; label: string } {
  if (!dueDate) return { kind: 'none', label: 'Sem prazo' };
  const today = dayKey(now);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const [y, m, d] = dueDate.split('-');
  if (dueDate < today) return { kind: 'late', label: dueDate === dayKey(yesterday) ? 'Atrasada · ontem' : `Atrasada · ${d}/${m}` };
  if (dueDate === today) return { kind: 'today', label: 'Hoje' };
  if (dueDate === dayKey(tomorrow)) return { kind: 'later', label: 'Amanhã' };
  return { kind: 'later', label: `${d}/${m}${y !== String(now.getFullYear()) ? `/${y}` : ''}` };
}

/**
 * The logged-in attendant's tasks, kept current through Supabase realtime (a
 * task assigned from any screen shows up without a reload). Also exposes the
 * most urgent pending task per contact, for the badge on the conversation list.
 */
export function useMyTasks() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTasks(await api.fetchMyTasks());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('my-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  const setDone = useCallback(async (id: string, done: boolean) => {
    const status = done ? 'done' : 'pending';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      await api.setTaskStatus(id, status);
    } catch {
      void refresh();
      throw new Error('Não foi possível atualizar a tarefa.');
    }
  }, [refresh]);

  // Counts and list badges are about what the attendant has to do themself —
  // tasks they only delegated are followed up in "Que você atribuiu".
  const pending = useMemo(() => tasks.filter((t) => t.status === 'pending' && t.assignedToMe), [tasks]);

  const badgeByContact = useMemo(() => {
    const rank: Record<TaskDueKind, number> = { late: 0, today: 1, later: 2, none: 3 };
    const map = new Map<string, { kind: TaskDueKind; label: string }>();
    for (const t of pending) {
      if (!t.contactId) continue;
      const due = taskDue(t.dueDate);
      const current = map.get(t.contactId);
      if (!current || rank[due.kind] < rank[current.kind]) {
        map.set(t.contactId, { kind: due.kind, label: due.kind === 'late' ? 'Atrasada' : due.kind === 'none' ? 'Tarefa' : due.label });
      }
    }
    return map;
  }, [pending]);

  return { tasks, pending, loading, setDone, badgeByContact };
}
