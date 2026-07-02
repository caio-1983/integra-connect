import React, { useState, useMemo } from 'react';
import { CheckSquare, Clock, AlertTriangle, User, Plus, Search } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/layout';
import { Button } from '@/components/Button';
import { MOCK_TASKS } from '@/constants';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: 'Alta',  color: 'text-red-600 bg-red-50 border-red-200' },
  medium: { label: 'Média', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low:    { label: 'Baixa', color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  pending:     { label: 'Pendente',    color: 'text-amber-600 bg-amber-50 border-amber-200' },
  in_progress: { label: 'Em Progresso', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  completed:   { label: 'Concluída',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
};

function formatDue(iso?: string): { text: string; overdue: boolean } {
  if (!iso) return { text: '', overdue: false };
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: `Atrasada ${Math.abs(diff)}d`, overdue: true };
  if (diff === 0) return { text: 'Hoje', overdue: false };
  if (diff === 1) return { text: 'Amanhã', overdue: false };
  return { text: `Em ${diff}d`, overdue: false };
}

const CRMTasks: React.FC = () => {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [search, setSearch] = useState('');
  const [localStatus, setLocalStatus] = useState<Record<string, TaskStatus>>({});

  const tasks = useMemo(() => {
    const term = search.toLowerCase();
    return MOCK_TASKS.filter(t => {
      const status = localStatus[t.id] ?? t.status;
      const matchStatus = filter === 'all' || status === filter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchSearch =
        t.title.toLowerCase().includes(term) ||
        (t.personName?.toLowerCase() ?? '').includes(term) ||
        (t.companyName?.toLowerCase() ?? '').includes(term) ||
        (t.dealTitle?.toLowerCase() ?? '').includes(term);
      return matchStatus && matchPriority && matchSearch;
    });
  }, [filter, priorityFilter, search, localStatus]);

  const toggleDone = (task: Task) => {
    const cur = localStatus[task.id] ?? task.status;
    setLocalStatus(p => ({
      ...p,
      [task.id]: cur === 'completed' ? 'pending' : 'completed',
    }));
  };

  const counts = useMemo(() => ({
    all:         MOCK_TASKS.length,
    pending:     MOCK_TASKS.filter(t => (localStatus[t.id] ?? t.status) === 'pending').length,
    in_progress: MOCK_TASKS.filter(t => (localStatus[t.id] ?? t.status) === 'in_progress').length,
    completed:   MOCK_TASKS.filter(t => (localStatus[t.id] ?? t.status) === 'completed').length,
  }), [localStatus]);

  return (
    <PageContainer>
      <PageHeader
        title="Tarefas"
        description="Gerencie tarefas vinculadas a conversas, negócios e pessoas."
        actions={
          <Button className="opacity-50 cursor-not-allowed" disabled title="Em breve">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, pessoa, empresa ou negócio"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'all', label: `Todas (${counts.all})` },
            { key: 'pending', label: `Pendentes (${counts.pending})` },
            { key: 'in_progress', label: `Em progresso (${counts.in_progress})` },
            { key: 'completed', label: `Concluídas (${counts.completed})` },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                filter === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex gap-1.5">
          {(['all', 'high', 'medium', 'low'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                priorityFilter === p
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted'
              )}
            >
              {p === 'all' ? 'Prioridade' : priorityConfig[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground">
            <CheckSquare className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-base font-medium text-foreground">Nenhuma tarefa encontrada</p>
            <p className="text-sm mt-1">Ajuste os filtros ou crie uma nova tarefa</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {tasks.map(task => {
              const status = localStatus[task.id] ?? task.status;
              const done = status === 'completed';
              const pri = priorityConfig[task.priority];
              const st = statusConfig[status];
              const due = formatDue(task.dueDate);

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/40',
                    done && 'opacity-60'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleDone(task)}
                    className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {done
                      ? <CheckSquare className="w-5 h-5 text-emerald-500" />
                      : <CheckSquare className="w-5 h-5" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={cn('text-sm font-medium text-foreground', done && 'line-through text-muted-foreground')}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{task.description}</p>
                        )}
                      </div>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0', st.color)}>
                        {st.label}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', pri.color)}>
                        {pri.label}
                      </span>
                      {task.dueDate && (
                        <span className={cn(
                          'flex items-center gap-1 text-[10px]',
                          due.overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'
                        )}>
                          {due.overdue ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {due.text}
                        </span>
                      )}
                      {task.ownerName && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="w-3 h-3" />
                          {task.ownerName}
                        </span>
                      )}
                      {task.personName && (
                        <span className="text-[10px] text-muted-foreground">
                          · {task.personName}
                        </span>
                      )}
                      {task.dealTitle && (
                        <span className="text-[10px] text-muted-foreground">
                          · {task.dealTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default CRMTasks;
