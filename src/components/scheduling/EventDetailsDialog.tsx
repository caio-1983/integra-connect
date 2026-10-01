import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Bot, CheckCircle2, Clock, MessageSquare, Pencil, Trash2, UserRound, Users, AlignLeft, Square, SquareCheck, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import type { Appointment, ScheduledTask } from '@/types';
import { cn, contactDisplayName, formatPhone } from '@/lib/utils';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';
import { capitalize, durationLabel, endTime, fromYmd, hhmm, type PersonColor } from './calendarUtils';
import { remindersApi } from '@/services/remindersApi';
import { remindersSummary } from '@/lib/reminders';

export type CalendarItem = { kind: 'appointment'; app: Appointment } | { kind: 'task'; task: ScheduledTask };

interface EventDetailsDialogProps {
  item: CalendarItem | null;
  onClose: () => void;
  colorOf: (userId?: string) => PersonColor;
  nameOf: (userId?: string) => string;
  onEdit: (a: Appointment) => void;
  onToggleCompleted: (a: Appointment) => Promise<void>;
  onDelete: (a: Appointment) => Promise<void>;
  onToggleTask: (t: ScheduledTask) => Promise<void>;
}

const longDate = (s: string) => capitalize(fromYmd(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));

const Row: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-4">
    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-icon" aria-hidden="true" />
    <div className="flex-1 min-w-0 text-[15px] text-foreground">{children}</div>
  </div>
);

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  item, onClose, colorOf, nameOf, onEdit, onToggleCompleted, onDelete, onToggleTask,
}) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  // Resumo dos lembretes do agendamento aberto, guardado com o id dele.
  const [reminders, setReminders] = useState<{ id: string; text: string } | null>(null);
  const appointmentId = item?.kind === 'appointment' ? item.app.id : null;
  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;
    remindersApi.fetchAppointmentReminders(appointmentId)
      .then(r => { if (!cancelled) setReminders({ id: appointmentId, text: remindersSummary(r) }); })
      .catch(error => console.error('Error loading reminders:', error));
    return () => { cancelled = true; };
  }, [appointmentId]);
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {item?.kind === 'appointment' && (() => {
          const a = item.app;
          const done = a.status === 'completed';
          const phone = a.contact?.phone_number;
          return (
            <>
              <div className="px-6 pt-6 pb-4 pr-12 flex items-start gap-4">
                <span className={cn('w-4 h-4 mt-1.5 rounded flex-shrink-0', colorOf(a.user_id).dot)} aria-hidden="true" />
                <div className="min-w-0">
                  <DialogTitle className={cn('text-[22px] leading-tight font-normal text-foreground break-words', done && 'line-through text-muted-foreground')}>
                    {a.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    {longDate(a.date)} · {hhmm(a.time)} – {endTime(a)}
                  </DialogDescription>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="px-2 h-6 rounded-full text-xs font-medium flex items-center bg-secondary text-secondary-foreground">{appointmentTypeLabel(a.type)}</span>
                    {done && (
                      <span className="px-2 h-6 rounded-full text-xs font-medium flex items-center gap-1 bg-success-subtle text-success">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Realizado
                      </span>
                    )}
                    {a.metadata?.source === 'nina_ai' && (
                      <span className="px-2 h-6 rounded-full text-xs font-medium flex items-center gap-1 bg-primary-subtle text-primary-subtle-foreground">
                        <Bot className="w-3 h-3" aria-hidden="true" /> Criado pela Lu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-5 space-y-4">
                <Row icon={Clock}>{durationLabel(a.duration || 60)}</Row>
                <Row icon={UserRound}>
                  <span className="text-muted-foreground">Responsável: </span>{nameOf(a.user_id)}
                </Row>
                {reminders?.id === a.id && <Row icon={Bell}>{reminders.text}</Row>}
                {a.contact_id && (
                  <Row icon={MessageSquare}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate">{contactDisplayName(a.contact?.name ?? '', phone ?? '', 'Contato')}</p>
                        {phone && <p className="text-sm text-muted-foreground tabular-nums">{formatPhone(phone)}</p>}
                      </div>
                      {phone && (
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/chat?contact=${encodeURIComponent(phone)}`)}>
                          Abrir conversa
                        </Button>
                      )}
                    </div>
                  </Row>
                )}
                {!!a.attendees?.length && <Row icon={Users}>{a.attendees.join(', ')}</Row>}
                {a.description && <Row icon={AlignLeft}><p className="whitespace-pre-wrap break-words">{a.description}</p></Row>}
              </div>

              <div className="px-4 py-3 flex items-center gap-1 border-t border-border bg-muted">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Excluir agendamento"
                  title="Excluir"
                  disabled={!!busy}
                  onClick={() => confirm(`Excluir "${a.title}"?`) && run('del', () => onDelete(a))}
                  className="hover:bg-danger-subtle hover:text-danger"
                >
                  {busy === 'del' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => onEdit(a)}>
                  <Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" /> Editar
                </Button>
                <Button
                  type="button"
                  variant={done ? 'outline' : 'primary'}
                  size="sm"
                  disabled={!!busy}
                  onClick={() => run('done', () => onToggleCompleted(a))}
                  className="ml-auto"
                >
                  {busy === 'done' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />}
                  {done ? 'Reabrir' : 'Marcar como realizado'}
                </Button>
              </div>
            </>
          );
        })()}

        {item?.kind === 'task' && (() => {
          const t = item.task;
          const done = t.status === 'done';
          return (
            <>
              <div className="px-6 pt-6 pb-4 pr-12 flex items-start gap-4">
                <span className={cn('w-4 h-4 mt-1.5 rounded flex-shrink-0', colorOf(t.assigneeUserId).dot)} aria-hidden="true" />
                <div className="min-w-0">
                  <DialogTitle className={cn('text-[22px] leading-tight font-normal text-foreground break-words', done && 'line-through text-muted-foreground')}>
                    {t.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">Tarefa · {longDate(t.dueDate)}</DialogDescription>
                </div>
              </div>
              <div className="px-6 pb-5 space-y-4">
                <Row icon={UserRound}><span className="text-muted-foreground">Responsável: </span>{t.assigneeName ?? nameOf(t.assigneeUserId)}</Row>
                <Row icon={MessageSquare}>{t.contactName}</Row>
              </div>
              <div className="px-4 py-3 flex justify-end border-t border-border bg-muted">
                <Button type="button" variant={done ? 'outline' : 'primary'} size="sm" disabled={!!busy} onClick={() => run('task', () => onToggleTask(t))}>
                  {busy === 'task' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    : done ? <Square className="w-4 h-4 mr-1.5" aria-hidden="true" /> : <SquareCheck className="w-4 h-4 mr-1.5" aria-hidden="true" />}
                  {done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                </Button>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};
