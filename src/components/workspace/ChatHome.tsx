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
  <kbd className="px-1.5 py-0.5 rounded bg-card border border-input text-foreground text-[11px] font-semibold font-sans">
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

  // One flat list, like a WhatsApp settings panel: icon, label, count, divider.
  const row = 'w-full flex items-center gap-4 h-14 px-4 text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:hover:bg-transparent';
  const count = 'text-[15px] font-medium tabular-nums text-foreground';

  const shortcuts = (
    <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 pt-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><Kbd>Ctrl K</Kbd> buscar</span>
      <span className="flex items-center gap-1.5"><Kbd>/</Kbd> respostas rápidas</span>
      {next && <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd> fechar conversa</span>}
    </div>
  );

  return (
    <div className="relative flex-1 min-w-0 bg-muted border-l border-border">
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex">
        <div className="m-auto w-full max-w-[560px] px-6 py-10 flex flex-col gap-5 text-foreground">
          {next ? (
            <>
              <div className="flex flex-col gap-1.5 text-center">
                <h1 className="text-[28px] font-bold leading-tight">{hello}</h1>
                <p className="text-[15px] text-muted-foreground">
                  {todayLabel} · {waiting.length === 1 ? '1 cliente esperando resposta' : `${waiting.length} clientes esperando resposta`}
                  {dueNow > 0 && ` · ${dueNow === 1 ? '1 tarefa sua para hoje' : `${dueNow} tarefas suas para hoje`}`}.
                </p>
              </div>

              <div className="rounded-lg bg-card overflow-hidden divide-y divide-border">
                <button type="button" onClick={() => onApplyFilter('waiting')} className={row}>
                  <Clock className="w-5 h-5 text-warning flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base">Aguardando</span>
                    <span className="block text-[13px] text-muted-foreground">cliente falou por último</span>
                  </span>
                  <span className={count}>{waiting.length}</span>
                </button>
                <button type="button" onClick={() => onApplyFilter('unread')} className={row}>
                  <MailOpen className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base">Não lidas</span>
                    <span className="block text-[13px] text-muted-foreground">com mensagem nova</span>
                  </span>
                  <span className={count}>{unread}</span>
                </button>
                <button type="button" onClick={() => onApplyFilter('mine')} className={row}>
                  <User className="w-5 h-5 text-icon flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base">Minhas</span>
                    <span className="block text-[13px] text-muted-foreground">atribuídas a você</span>
                  </span>
                  <span className={count}>{mine}</span>
                </button>
                <button type="button" onClick={scrollToTasks} disabled={tasks.length === 0} className={row}>
                  <SquareCheck className="w-5 h-5 text-icon flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base">Tarefas</span>
                    <span className="block text-[13px] text-muted-foreground">pendentes para você</span>
                  </span>
                  <span className={count}>{pendingTasks.length}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-[88px] h-[88px] rounded-full bg-card flex items-center justify-center text-primary">
                <MessageSquare className="w-10 h-10" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[28px] font-bold">Fila zerada</h1>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {todayLabel}. Nenhum cliente esperando resposta agora. Quando chegar mensagem nova, ela aparece no topo da lista.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5">
                <button type="button" onClick={onNewConversation} className="h-10 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-2">
                  <Plus className="w-[18px] h-[18px]" aria-hidden="true" /> Nova conversa
                </button>
                <button type="button" onClick={() => navigate('/scheduling')} className="h-10 px-5 rounded-full border border-input bg-card text-primary text-sm font-medium hover:bg-accent">
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

          <p className="flex items-start gap-2 px-1 text-[13px] leading-relaxed text-muted-foreground">
            <Sparkles className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">Lu no modo copiloto.</span>{' '}
              Ao abrir uma conversa em que o cliente falou por último, a Lu sugere a resposta e preenche a ficha da oportunidade. Nada é enviado sem o seu clique.
            </span>
          </p>

          {numbers.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-lg bg-card">
              <Smartphone className="w-4 h-4 text-icon" aria-hidden="true" />
              <span className="text-[13px] text-muted-foreground flex-1">Números</span>
              {numbers.map((n) => (
                <span key={n.name} className="flex items-center gap-1.5 text-[13px] font-medium">
                  <span aria-hidden="true" className={n.connected ? 'w-2 h-2 rounded-full bg-success' : 'w-2 h-2 rounded-full bg-danger'} />
                  {labels[n.name] ?? n.profileName ?? n.name}
                  {!n.connected && <span className="text-danger font-semibold">desconectado</span>}
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
