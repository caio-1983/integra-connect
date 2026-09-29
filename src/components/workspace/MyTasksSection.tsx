import React from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MyTask } from '@/types';
import { taskDue } from '@/hooks/useMyTasks';

interface MyTasksSectionProps {
  tasks: MyTask[];
  onToggle: (id: string, done: boolean) => Promise<void>;
  /** Conversation to open for a task's contact; null when none is loaded for it. */
  conversationFor: (contactId: string | null) => string | null;
  onOpenConversation: (conversationId: string) => void;
}

const DUE_CLASS = {
  late: 'text-red-700 dark:text-red-400',
  today: 'text-amber-800 dark:text-amber-400',
  later: 'text-[var(--wa-meta)]',
  none: 'text-[var(--wa-meta)]',
} as const;

const RANK = { late: 0, today: 1, later: 2, none: 3 };

function byUrgency(a: MyTask, b: MyTask): number {
  if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
  const da = taskDue(a.dueDate), db = taskDue(b.dueDate);
  return RANK[da.kind] - RANK[db.kind] || (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
}

/**
 * "Minhas tarefas" on the chat home: what the logged-in attendant has to do,
 * most urgent first, then what they delegated to others so they can follow up.
 * Ticking one marks it done (it stays struck through until tomorrow);
 * "Abrir conversa" jumps to that contact's chat.
 */
const MyTasksSection: React.FC<MyTasksSectionProps> = ({ tasks, onToggle, conversationFor, onOpenConversation }) => {
  const mine = tasks.filter((t) => t.assignedToMe).sort(byUrgency);
  const delegated = tasks.filter((t) => !t.assignedToMe).sort(byUrgency);

  const row = (t: MyTask) => {
    const due = taskDue(t.dueDate);
    const done = t.status === 'done';
    const conversationId = conversationFor(t.contactId);
    const who = t.assignedToMe
      ? t.createdByName && `atribuída por ${t.createdByName}`
      : t.assigneeName ? `para ${t.assigneeName}` : 'sem responsável';
    return (
      <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/10">
        <label className="w-7 h-7 flex items-center justify-center flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={done}
            aria-label={done ? `Reabrir: ${t.title}` : `Concluir: ${t.title}`}
            onChange={() => onToggle(t.id, !done).catch((err) => toast.error(err.message))}
            className="w-[18px] h-[18px] accent-[#008069]"
          />
        </label>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className={cn('text-[14.5px] font-semibold truncate', done && 'line-through text-[var(--wa-meta)]')}>{t.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-[var(--wa-meta)]">
            <span className={cn('font-semibold', done ? 'text-[var(--wa-meta)]' : DUE_CLASS[due.kind])}>{due.label}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{t.contactName}</span>
            {who && (
              <>
                <span aria-hidden="true">·</span>
                <span>{who}</span>
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          disabled={!conversationId}
          title={conversationId ? undefined : 'Nenhuma conversa com este contato'}
          onClick={() => conversationId && onOpenConversation(conversationId)}
          className="flex-shrink-0 h-8 px-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Abrir conversa
        </button>
      </div>
    );
  };

  return (
    <section id="minhas-tarefas" aria-label="Minhas tarefas" className="rounded-2xl bg-[var(--wa-in)] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] overflow-hidden scroll-mt-6">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-black/5 dark:border-white/10">
        <h2 className="text-[15px] font-bold flex-1">Minhas tarefas</h2>
        <span className="text-[12.5px] text-[var(--wa-meta)]">ordenadas pelo prazo</span>
      </div>
      {mine.length > 0 ? mine.map(row) : (
        <p className="px-4 py-3 text-[13px] text-[var(--wa-meta)] border-b border-black/5 dark:border-white/10">Nenhuma tarefa para você.</p>
      )}
      {delegated.length > 0 && (
        <>
          <h3 className="px-4 pt-3.5 pb-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[var(--wa-meta)]">Que você atribuiu</h3>
          {delegated.map(row)}
        </>
      )}
      <p className="px-4 py-2.5 text-[12.5px] text-[var(--wa-meta)]">Tarefas concluídas somem da lista no dia seguinte.</p>
    </section>
  );
};

export { MyTasksSection };
