import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MailOpen, User, Sparkles, Smartphone, MessageSquare, Plus, SquareCheck } from 'lucide-react';
import type { MyTask, UIConversation } from '@/types';
import { MyTasksSection } from './MyTasksSection';
import { taskDue } from '@/hooks/useMyTasks';
import type { QueueFilter } from './ConversationFilters';
import { isAwaitingReply } from './ConversationQueue';
import { useAuth } from '@/hooks/useAuth';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import { useInstanceLabels } from '@/hooks/useInstanceLabels';
import { supabase } from '@/integrations/supabase/client';

interface ChatHomeProps {
  conversations: UIConversation[];
  sdrName: string;
  onOpenConversation: (id: string) => void;
  onApplyFilter: (filter: QueueFilter) => void;
  onNewConversation: () => void;
  /** The logged-in attendant's tasks (pending + done today). */
  tasks: MyTask[];
  onToggleTask: (id: string, done: boolean) => Promise<void>;
}

function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** A person's first name for the greeting — team_members.name first, as the sidebar does. */
function useFirstName(): string | null {
  const { user } = useAuth();
  const [name, setName] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase.from('team_members').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const full = data?.name?.trim() || (user.user_metadata?.full_name as string | undefined) || '';
        setName(full.split(/\s+/)[0] || null);
      });
    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.full_name]);
  return name;
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded-[5px] bg-[var(--wa-in)] shadow-[0_1px_0_rgba(11,20,26,0.18)] text-[var(--wa-text)] text-[11.5px] font-semibold font-sans">
    {children}
  </kbd>
);

/**
 * What the chat column shows with no conversation open: instead of "select a
 * conversation", it tells the attendant what to do next — who has waited the
 * longest, the queue counts as shortcuts into the list, Lu's mode, the numbers
 * online. With nobody waiting, it says so and offers a new conversation.
 */
const ChatHome: React.FC<ChatHomeProps> = ({ conversations, sdrName, onOpenConversation, onApplyFilter, onNewConversation, tasks, onToggleTask }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = useFirstName();
  const { instances } = useWhatsappInstances();
  const { labels } = useInstanceLabels();
  const [now, setNow] = React.useState(() => Date.now());

  // Keeps the date and greeting current while the screen stays open.
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const inbox = conversations.filter((c) => !c.isArchived);
  const waiting = inbox
    .filter(isAwaitingReply)
    .sort((a, b) => (a.messages[a.messages.length - 1]?.sentAt ?? '').localeCompare(b.messages[b.messages.length - 1]?.sentAt ?? ''));
  const unread = inbox.filter((c) => c.unreadCount > 0).length;
  const mine = inbox.filter((c) => !!user?.id && c.assignedUserId === user.id).length;
  const next = waiting[0];
  const pendingTasks = tasks.filter((t) => t.status === 'pending' && t.assignedToMe);
  const dueNow = pendingTasks.filter((t) => ['late', 'today'].includes(taskDue(t.dueDate).kind)).length;
  // A task opens its contact's conversation — the active one first.
  const conversationFor = (contactId: string | null) => {
    if (!contactId) return null;
    const matches = conversations.filter((c) => c.contactId === contactId);
    return (matches.find((c) => !c.isArchived) ?? matches[0])?.id ?? null;
  };
  const scrollToTasks = () => document.getElementById('minhas-tarefas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Only numbers this attendant works with (their conversations are already access-filtered).
  const myInstances = new Set(inbox.map((c) => c.instance).filter(Boolean));
  const numbers = instances.filter((i) => myInstances.has(i.name));

  const today = new Date(now).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
  const hello = `${greeting(new Date(now))}${firstName ? `, ${firstName}` : ''}`;

  const tile = 'flex flex-col gap-2.5 p-4 rounded-xl bg-[var(--wa-in)] text-left shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] hover:shadow-md transition-shadow';

  const shortcuts = (
    <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 pt-1 text-[12.5px] text-[var(--wa-meta)]">
      <span className="flex items-center gap-1.5"><Kbd>Ctrl K</Kbd> buscar</span>
      <span className="flex items-center gap-1.5"><Kbd>/</Kbd> respostas rápidas</span>
      {next && <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> fechar conversa</span>}
    </div>
  );

  return (
    <div className="chat-wall flex-1 min-w-0">
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex">
        <div className="m-auto w-full max-w-[620px] px-6 py-10 flex flex-col gap-5 text-[var(--wa-text)]">
          {next ? (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[var(--wa-meta)]">{todayLabel}</span>
                <h1 className="text-[28px] font-bold tracking-tight leading-tight">{hello}</h1>
                <p className="text-[15px] text-[var(--wa-meta)]">
                  {waiting.length === 1 ? '1 cliente esperando resposta' : `${waiting.length} clientes esperando resposta`}
                  {dueNow > 0 && ` · ${dueNow === 1 ? '1 tarefa sua para hoje' : `${dueNow} tarefas suas para hoje`}`}.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <button type="button" onClick={() => onApplyFilter('waiting')} className={tile}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 dark:text-amber-400"><Clock className="w-4 h-4" />Aguardando</span>
                  <span className="text-3xl font-bold leading-none">{waiting.length}</span>
                  <span className="text-[12.5px] text-[var(--wa-meta)]">cliente falou por último</span>
                </button>
                <button type="button" onClick={() => onApplyFilter('unread')} className={tile}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#005c4b] dark:text-[#00a884]"><MailOpen className="w-4 h-4" />Não lidas</span>
                  <span className="text-3xl font-bold leading-none">{unread}</span>
                  <span className="text-[12.5px] text-[var(--wa-meta)]">com mensagem nova</span>
                </button>
                <button type="button" onClick={() => onApplyFilter('mine')} className={tile}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1f4f8a] dark:text-sky-400"><User className="w-4 h-4" />Minhas</span>
                  <span className="text-3xl font-bold leading-none">{mine}</span>
                  <span className="text-[12.5px] text-[var(--wa-meta)]">atribuídas a você</span>
                </button>
                <button type="button" onClick={scrollToTasks} disabled={tasks.length === 0} className={tile}>
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6a3fb0] dark:text-violet-400"><SquareCheck className="w-4 h-4" />Tarefas</span>
                  <span className="text-3xl font-bold leading-none">{pendingTasks.length}</span>
                  <span className="text-[12.5px] text-[var(--wa-meta)]">pendentes para você</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-[88px] h-[88px] rounded-full bg-[var(--wa-in)] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center justify-center text-[#008069]">
                <MessageSquare className="w-10 h-10" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[var(--wa-meta)]">{todayLabel}</span>
                <h1 className="text-[28px] font-bold tracking-tight">Fila zerada</h1>
                <p className="text-[15px] leading-relaxed text-[var(--wa-meta)]">
                  Nenhum cliente esperando resposta agora. Quando chegar mensagem nova, ela aparece no topo da lista.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={onNewConversation} className="h-11 px-5 rounded-full bg-[#008069] hover:bg-[#006e5a] text-white text-[14.5px] font-bold flex items-center gap-2">
                  <Plus className="w-[18px] h-[18px]" /> Nova conversa
                </button>
                <button type="button" onClick={() => navigate('/scheduling')} className="h-11 px-5 rounded-full bg-[var(--wa-in)] text-[14.5px] font-semibold shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                  Ver agendamentos
                </button>
              </div>
            </div>
          )}

          {tasks.length > 0 && (
            <MyTasksSection
              tasks={tasks}
              onToggle={onToggleTask}
              conversationFor={conversationFor}
              onOpenConversation={onOpenConversation}
            />
          )}

          <div className="flex gap-3 items-start p-4 rounded-xl bg-[var(--wa-in)] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
            <span className="w-9 h-9 rounded-[10px] bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-[18px] h-[18px]" />
            </span>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-bold">Lu no modo copiloto</span>
                <span className="text-[11.5px] font-bold px-2 py-0.5 rounded-full bg-[#e7f5ef] text-[#005c4b] dark:bg-[#005c4b]/40 dark:text-[#d9fdd3]">Ativa</span>
              </div>
              <p className="text-[13.5px] leading-relaxed text-[var(--wa-meta)]">
                Ao abrir uma conversa em que o cliente falou por último, a Lu sugere a resposta e preenche a ficha da oportunidade. Nada é enviado sem o seu clique.
              </p>
            </div>
          </div>

          {numbers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl bg-white/60 dark:bg-[#202c33]/60">
              <Smartphone className="w-4 h-4 text-[var(--wa-meta)]" />
              <span className="text-[13.5px] text-[var(--wa-meta)] flex-1">Números</span>
              {numbers.map((n) => (
                <span key={n.name} className="flex items-center gap-1.5 text-[13px] font-medium">
                  <span className={n.connected ? 'w-2 h-2 rounded-full bg-[#25d366]' : 'w-2 h-2 rounded-full bg-red-500'} />
                  {labels[n.name] ?? n.profileName ?? n.name}
                  {!n.connected && <span className="text-red-700 dark:text-red-400 font-semibold">desconectado</span>}
                </span>
              ))}
            </div>
          )}

          {shortcuts}
        </div>
      </div>
    </div>
  );
};

export { ChatHome };
