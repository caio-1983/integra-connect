import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  compact?: boolean;
  onToggle?: (taskId: string, status: TaskStatus) => void;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: 'Alta',  color: 'text-red-600 bg-red-50 border-red-200' },
  medium: { label: 'Média', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low:    { label: 'Baixa', color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

function formatDue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `Atrasada ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `Em ${diff}d`;
}

function isOverdue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, compact = false, onToggle }) => {
  const [localStatus, setLocalStatus] = useState<Record<string, TaskStatus>>({});

  const getStatus = (task: Task): TaskStatus => localStatus[task.id] ?? task.status;

  const toggle = (task: Task) => {
    const current = getStatus(task);
    const next: TaskStatus = current === 'completed' ? 'pending' : 'completed';
    setLocalStatus(prev => ({ ...prev, [task.id]: next }));
    onToggle?.(task.id, next);
  };

  if (tasks.length === 0) {
    return (
      <div className="py-3 text-center text-xs text-muted-foreground">
        Nenhuma tarefa vinculada.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map(task => {
        const status = getStatus(task);
        const done = status === 'completed';
        const overdue = !done && isOverdue(task.dueDate);
        const pri = priorityConfig[task.priority];

        return (
          <div
            key={task.id}
            className={cn(
              'flex items-start gap-2 rounded-lg px-2.5 py-2 border transition-colors',
              done ? 'bg-muted/30 border-border/50 opacity-60' : 'bg-card border-border hover:bg-muted/40'
            )}
          >
            <button
              onClick={() => toggle(task)}
              className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
            >
              {done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <Circle className="w-4 h-4" />}
            </button>

            <div className="flex-1 min-w-0">
              <p className={cn('text-xs leading-snug font-medium', done ? 'line-through text-muted-foreground' : 'text-foreground')}>
                {task.title}
              </p>
              {!compact && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', pri.color)}>
                    {pri.label}
                  </span>
                  {task.dueDate && (
                    <span className={cn(
                      'text-[10px] flex items-center gap-0.5',
                      overdue ? 'text-red-500' : 'text-muted-foreground'
                    )}>
                      {overdue ? <AlertTriangle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {formatDue(task.dueDate)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
