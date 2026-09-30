import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Loader2, CloudOff, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './Button';
import { Appointment, Contact, ScheduledTask } from '../types';
import { api } from '../services/api';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer, PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';
import {
  type ViewMode, NO_PERSON_COLOR, PERSON_COLORS, addDays, capitalize, fromYmd, hhmm, startOfWeek, toMinutes, ymd,
} from './scheduling/calendarUtils';
import { MiniMonth } from './scheduling/MiniMonth';
import { MonthView } from './scheduling/MonthView';
import { TimeGridView } from './scheduling/TimeGridView';
import { AppointmentFormDialog, type AppointmentFormValues } from './scheduling/AppointmentFormDialog';
import { EventDetailsDialog, type CalendarItem } from './scheduling/EventDetailsDialog';

type TeamUser = { user_id: string; name: string };

const VIEWS: { value: ViewMode; label: string; key: string }[] = [
  { value: 'month', label: 'Mês', key: 'M' },
  { value: 'week', label: 'Semana', key: 'S' },
  { value: 'day', label: 'Dia', key: 'D' },
];

const blankForm = (date: string, time = '09:00'): AppointmentFormValues => ({
  title: '', date, time, duration: 60, type: 'meeting', description: '', contactId: '', attendees: '',
});

/** Unowned items filter under this key. */
const NO_OWNER = '';

const Scheduling: React.FC = () => {
  const [cursor, setCursor] = useState(() => new Date());
  // Phones open on the day: seven columns don't fit.
  const [view, setView] = useState<ViewMode>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'month'));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Tasks with a due date show as all-day items next to the appointments.
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const [detail, setDetail] = useState<CalendarItem | null>(null);
  const [form, setForm] = useState<{ open: boolean; mode: 'create' | 'edit'; initial: AppointmentFormValues; id?: string }>(
    { open: false, mode: 'create', initial: blankForm(ymd(new Date())) },
  );

  const loadAppointments = useCallback(() => api.fetchAppointments().then(setAppointments), []);
  const loadTasks = useCallback(() => api.fetchScheduledTasks().then(setTasks), []);

  useEffect(() => {
    Promise.all([loadAppointments(), loadTasks(), api.fetchContacts().then(setContacts)])
      .catch((error) => { console.error('Erro ao carregar agenda', error); setFailed(true); })
      .finally(() => setLoading(false));

    supabase
      .from('team_members')
      .select('*')
      .not('user_id', 'is', null)
      .order('name', { ascending: true })
      // `hidden` = maintenance account, not listed (see api.fetchTeam).
      .then(({ data }) => setTeam((data ?? []).filter(m => !(m as { hidden?: boolean }).hidden).map(m => ({ user_id: m.user_id, name: m.name })) as TeamUser[]));

    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => { loadAppointments(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { loadTasks(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAppointments, loadTasks]);

  // --- People: colour by position in the team list, then anyone else who owns something.
  const people = useMemo(() => {
    const ids = team.map(u => u.user_id);
    for (const a of appointments) if (a.user_id && !ids.includes(a.user_id)) ids.push(a.user_id);
    for (const t of tasks) if (t.assigneeUserId && !ids.includes(t.assigneeUserId)) ids.push(t.assigneeUserId);
    return ids;
  }, [team, appointments, tasks]);

  const colorOf = useCallback((userId?: string) => {
    const i = userId ? people.indexOf(userId) : -1;
    return i < 0 ? NO_PERSON_COLOR : PERSON_COLORS[i % PERSON_COLORS.length];
  }, [people]);

  const nameOf = useCallback((userId?: string) =>
    team.find(u => u.user_id === userId)?.name ?? (userId ? 'Usuário' : 'Sem responsável'), [team]);

  const legend = useMemo(() => {
    const present = new Set([...appointments.map(a => a.user_id ?? NO_OWNER), ...tasks.map(t => t.assigneeUserId ?? NO_OWNER)]);
    const ids = people.filter(id => present.has(id));
    return present.has(NO_OWNER) ? [...ids, NO_OWNER] : ids;
  }, [people, appointments, tasks]);

  const togglePerson = (id: string) => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // --- Index by date, after the people filter.
  const { appsByDate, tasksByDate } = useMemo(() => {
    const appsByDate = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (hidden.has(a.user_id ?? NO_OWNER)) continue;
      (appsByDate.get(a.date) ?? appsByDate.set(a.date, []).get(a.date)!).push(a);
    }
    appsByDate.forEach(list => list.sort((x, y) => toMinutes(x.time) - toMinutes(y.time)));
    const tasksByDate = new Map<string, ScheduledTask[]>();
    for (const t of tasks) {
      if (hidden.has(t.assigneeUserId ?? NO_OWNER)) continue;
      (tasksByDate.get(t.dueDate) ?? tasksByDate.set(t.dueDate, []).get(t.dueDate)!).push(t);
    }
    return { appsByDate, tasksByDate };
  }, [appointments, tasks, hidden]);

  const appsOn = useCallback((d: string) => appsByDate.get(d) ?? [], [appsByDate]);
  const tasksOn = useCallback((d: string) => tasksByDate.get(d) ?? [], [tasksByDate]);
  const busyDays = useMemo(() => new Set([...appsByDate.keys(), ...tasksByDate.keys()]), [appsByDate, tasksByDate]);

  const today = ymd(new Date());
  const weekStart = startOfWeek(new Date());
  const counts = useMemo(() => {
    const week = new Set(Array.from({ length: 7 }, (_, i) => ymd(addDays(weekStart, i))));
    let t = 0, w = 0;
    for (const a of appointments) { if (a.date === today) t++; if (week.has(a.date)) w++; }
    return { today: t, week: w };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, today]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return appointments
      .filter(a => a.status !== 'completed' && !hidden.has(a.user_id ?? NO_OWNER))
      .filter(a => a.date > today || (a.date === today && toMinutes(a.time) + (a.duration || 60) > nowMin))
      .sort((a, b) => a.date.localeCompare(b.date) || toMinutes(a.time) - toMinutes(b.time))
      .slice(0, 5);
  }, [appointments, hidden, today]);

  // --- Navigation
  const shift = useCallback((dir: number) => setCursor(c => {
    if (view === 'month') return new Date(c.getFullYear(), c.getMonth() + dir, 1);
    return addDays(c, dir * (view === 'week' ? 7 : 1));
  }), [view]);

  const openDay = (d: Date) => { setCursor(d); setView('day'); };

  const openCreate = useCallback((date: string, time?: string) =>
    setForm({ open: true, mode: 'create', initial: blankForm(date, time) }), []);

  const title = useMemo(() => {
    if (view === 'month') return capitalize(cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
    if (view === 'day') return capitalize(cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    const s = startOfWeek(cursor), e = addDays(s, 6);
    const m = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return s.getMonth() === e.getMonth()
      ? `${s.getDate()} – ${e.getDate()} de ${m(e)} de ${e.getFullYear()}`
      : `${s.getDate()} ${m(s)} – ${e.getDate()} ${m(e)} de ${e.getFullYear()}`;
  }, [view, cursor]);

  // Keyboard: T hoje, M/S/D views, ←/→ navegar, N novo — like any calendar app.
  const dialogOpen = form.open || !!detail;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      const k = e.key.toLowerCase();
      if (k === 't') setCursor(new Date());
      else if (k === 'm') setView('month');
      else if (k === 's') setView('week');
      else if (k === 'd') setView('day');
      else if (k === 'n') { e.preventDefault(); openCreate(ymd(view === 'month' ? new Date() : cursor)); }
      else if (e.key === 'ArrowLeft') shift(-1);
      else if (e.key === 'ArrowRight') shift(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, shift, openCreate, view, cursor]);

  // --- Mutations (realtime refetches too; reloading here keeps it instant)
  const submitForm = async (v: AppointmentFormValues) => {
    const payload = {
      title: v.title.trim(),
      description: v.description,
      date: v.date,
      time: v.time,
      duration: v.duration,
      type: v.type,
      attendees: v.attendees.split(',').map(s => s.trim()).filter(Boolean),
      contact_id: v.contactId || undefined,
    };
    try {
      if (form.mode === 'edit' && form.id) {
        await api.updateAppointment(form.id, payload);
        toast.success('Agendamento atualizado');
      } else {
        await api.createAppointment(payload);
        toast.success('Agendamento criado');
      }
      setForm(f => ({ ...f, open: false }));
      setCursor(fromYmd(v.date));
      await loadAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Não foi possível salvar o agendamento');
    }
  };

  const editAppointment = (a: Appointment) => {
    setDetail(null);
    setForm({
      open: true, mode: 'edit', id: a.id,
      initial: {
        title: a.title, date: a.date, time: hhmm(a.time), duration: a.duration || 60, type: a.type,
        description: a.description ?? '', contactId: a.contact_id ?? '', attendees: a.attendees?.join(', ') ?? '',
      },
    });
  };

  const toggleCompleted = async (a: Appointment) => {
    const completed = a.status !== 'completed';
    try {
      await api.setAppointmentCompleted(a.id, completed);
      toast.success(completed ? 'Marcado como realizado' : 'Agendamento reaberto');
      setDetail(null);
      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Não foi possível atualizar o agendamento');
    }
  };

  const deleteAppointment = async (a: Appointment) => {
    try {
      await api.deleteAppointment(a.id);
      toast.success('Agendamento excluído');
      setDetail(null);
      await loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Não foi possível excluir o agendamento');
    }
  };

  const toggleTask = async (t: ScheduledTask) => {
    try {
      await api.setTaskStatus(t.id, t.status === 'done' ? 'pending' : 'done');
      toast.success(t.status === 'done' ? 'Tarefa reaberta' : 'Tarefa concluída');
      setDetail(null);
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Não foi possível atualizar a tarefa');
    }
  };

  const upcomingLabel = (a: Appointment) => {
    if (a.date === today) return 'Hoje';
    if (a.date === ymd(addDays(new Date(), 1))) return 'Amanhã';
    return capitalize(fromYmd(a.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));
  };

  const viewProps = {
    appsOn, tasksOn, colorOf,
    onOpenDay: openDay,
    onOpenAppointment: (app: Appointment) => setDetail({ kind: 'appointment', app }),
    onOpenTask: (task: ScheduledTask) => setDetail({ kind: 'task', task }),
  };

  return (
    <PageContainer scrollable={false} className="gap-5">
      <PageHeader
        title="Agenda"
        description={loading ? 'Carregando…' : `${counts.today} ${counts.today === 1 ? 'agendamento' : 'agendamentos'} hoje · ${counts.week} nesta semana`}
      />

      <div className="flex-1 min-h-0 flex gap-3">
        {/* Side rail */}
        <aside className="hidden lg:flex w-[272px] flex-shrink-0 flex-col gap-3 min-h-0 overflow-y-auto">
          <Button onClick={() => openCreate(ymd(view === 'month' ? new Date() : cursor))} size="lg" className="self-start flex-shrink-0 px-6 shadow-wa-bubble" title="Novo agendamento (N)">
            <Plus className="w-5 h-5 mr-2" aria-hidden="true" /> Agendar
          </Button>

          <div className="rounded-lg bg-card border border-border p-3">
            <MiniMonth selected={cursor} busy={busyDays} onSelect={(d) => { setCursor(d); if (view === 'month') setView('day'); }} />
          </div>

          {legend.length > 0 && (
            <div className="rounded-lg bg-card border border-border py-3">
              <h2 className="px-4 pb-1 text-sm text-primary">Pessoas</h2>
              <ul>
                {legend.map(id => {
                  const on = !hidden.has(id);
                  const c = colorOf(id || undefined);
                  return (
                    <li key={id || 'none'}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => togglePerson(id)}
                        className="w-full flex items-center gap-3 px-4 h-9 text-left text-sm hover:bg-accent transition-colors"
                      >
                        <span className={cn('w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors', on ? cn(c.dot, 'border-transparent') : 'border-icon/50')}>
                          {on && <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <span className={cn('truncate', on ? 'text-foreground' : 'text-muted-foreground')}>{nameOf(id || undefined)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-lg bg-card border border-border py-3">
            <h2 className="px-4 pb-1 text-sm text-primary">Próximos</h2>
            {upcoming.length === 0 ? (
              <p className="px-4 py-2 text-sm text-muted-foreground">Nada marcado daqui para frente.</p>
            ) : (
              <ul>
                {upcoming.map(a => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setDetail({ kind: 'appointment', app: a })}
                      className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-accent transition-colors"
                    >
                      <span className={cn('w-2 h-2 mt-1.5 rounded-full flex-shrink-0', colorOf(a.user_id).dot)} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground truncate">
                          {a.title}
                          {a.metadata?.source === 'nina_ai' && <Bot className="inline w-3 h-3 ml-1 -mt-0.5 text-icon" aria-label="Criado pela Lu" />}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">{upcomingLabel(a)} · {hhmm(a.time)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Calendar */}
        <section aria-label="Calendário" className="flex-1 min-w-0 min-h-0 rounded-lg bg-card border border-border overflow-hidden flex flex-col">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} title="Hoje (T)">Hoje</Button>
            <div className="flex">
              <button type="button" onClick={() => shift(-1)} aria-label="Anterior" title="Anterior (←)" className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent">
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => shift(1)} aria-label="Próximo" title="Próximo (→)" className="w-9 h-9 rounded-full flex items-center justify-center text-icon hover:bg-accent">
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <h2 className="text-lg text-foreground truncate min-w-0 flex-1" aria-live="polite">
              {view === 'day' ? (
                <>
                  <span className="sm:hidden">{capitalize(cursor.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''))}</span>
                  <span className="hidden sm:inline">{title}</span>
                </>
              ) : title}
            </h2>

            <div role="radiogroup" aria-label="Visualização" className="flex p-0.5 rounded-full bg-secondary">
              {VIEWS.map(v => (
                <button
                  key={v.value}
                  type="button"
                  role="radio"
                  aria-checked={view === v.value}
                  onClick={() => setView(v.value)}
                  title={`${v.label} (${v.key})`}
                  className={cn(
                    'px-3 sm:px-4 h-8 rounded-full text-sm transition-colors',
                    view === v.value ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => openCreate(ymd(view === 'month' ? new Date() : cursor))} className="lg:hidden" aria-label="Novo agendamento">
              <Plus className="w-4 h-4 sm:mr-1" aria-hidden="true" /><span className="hidden sm:inline">Agendar</span>
            </Button>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm text-muted-foreground">Carregando agenda…</span>
            </div>
          ) : failed ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <CloudOff className="w-10 h-10 text-icon/40" aria-hidden="true" />
              <p className="text-base text-foreground">Não foi possível carregar a agenda</p>
              <p className="text-sm text-muted-foreground">Recarregue a página para tentar de novo.</p>
            </div>
          ) : view === 'month' ? (
            <MonthView anchor={cursor} onCreate={(date) => openCreate(date)} {...viewProps} />
          ) : (
            <TimeGridView
              days={view === 'day' ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))}
              onCreate={openCreate}
              {...viewProps}
            />
          )}
        </section>
      </div>

      <AppointmentFormDialog
        open={form.open}
        onOpenChange={(open) => setForm(f => ({ ...f, open }))}
        mode={form.mode}
        initial={form.initial}
        contacts={contacts}
        onSubmit={submitForm}
      />

      <EventDetailsDialog
        item={detail}
        onClose={() => setDetail(null)}
        colorOf={colorOf}
        nameOf={nameOf}
        onEdit={editAppointment}
        onToggleCompleted={toggleCompleted}
        onDelete={deleteAppointment}
        onToggleTask={toggleTask}
      />
    </PageContainer>
  );
};

export default Scheduling;
