import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlignLeft, Bot, Calendar, Clock, Loader2, MessageSquare, UserRound, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';
import { formatPhone } from '@/lib/utils';

export interface AppointmentDetail {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  duration: number | null;
  description: string | null;
  attendees: string[] | null;
  /** auth.users.id of whoever created the appointment. */
  user_id: string | null;
  metadata: { source?: string } | null;
  contact: { name: string | null; phone_number: string | null } | null;
}

interface AppointmentDetailDialogProps {
  appointment: AppointmentDetail | null;
  onOpenChange: (open: boolean) => void;
}

const Row: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-4">
    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-icon" aria-hidden="true" />
    <div className="flex-1 min-w-0 text-[15px] text-foreground">{children}</div>
  </div>
);

const endOf = (time: string, duration: number) => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  const t = (h * 60 + m + duration) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export const AppointmentDetailDialog: React.FC<AppointmentDetailDialogProps> = ({ appointment, onOpenChange }) => {
  const navigate = useNavigate();
  const [schedulerName, setSchedulerName] = useState<string | null>(null);
  const [loadingScheduler, setLoadingScheduler] = useState(false);

  const createdByAI = appointment?.metadata?.source === 'nina_ai';

  // user_id is the auth id; the readable name lives in team_members.
  useEffect(() => {
    setSchedulerName(null);
    if (!appointment?.user_id || createdByAI) return;
    let cancelled = false;
    setLoadingScheduler(true);
    supabase
      .from('team_members')
      .select('name')
      .eq('user_id', appointment.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSchedulerName(data?.name?.trim() || null);
        setLoadingScheduler(false);
      });
    return () => { cancelled = true; };
  }, [appointment?.id, appointment?.user_id, createdByAI]);

  const renderScheduler = () => {
    if (createdByAI) return <span className="inline-flex items-center gap-1.5"><Bot className="w-4 h-4 text-primary" aria-hidden="true" /> Agendado pela Lu</span>;
    if (loadingScheduler) return <Loader2 className="inline w-4 h-4 animate-spin text-icon" aria-label="Carregando" />;
    return schedulerName ?? <span className="text-muted-foreground">Não identificado</span>;
  };

  const a = appointment;
  const phone = a?.contact?.phone_number;
  const longDate = a
    ? (() => {
        const [y, m, d] = a.date.split('-').map(Number);
        const s = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
      })()
    : '';

  return (
    <Dialog open={!!a} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {a && (
          <>
            <div className="px-6 pt-6 pb-4 pr-12">
              <DialogTitle className="text-[22px] leading-tight font-normal text-foreground break-words">{a.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground tabular-nums">
                {longDate} · {a.time.slice(0, 5)}{a.duration ? ` – ${endOf(a.time, a.duration)}` : ''}
              </DialogDescription>
              <span className="mt-3 inline-flex px-2 h-6 rounded-full text-xs font-medium items-center bg-secondary text-secondary-foreground">
                {appointmentTypeLabel(a.type)}
              </span>
            </div>

            <div className="px-6 pb-5 space-y-4">
              <Row icon={UserRound}><span className="text-muted-foreground">Quem agendou: </span>{renderScheduler()}</Row>
              <Row icon={MessageSquare}>
                {a.contact ? (
                  <>
                    <p className="truncate">{a.contact.name || 'Sem nome'}</p>
                    {phone && <p className="text-sm text-muted-foreground tabular-nums">{formatPhone(phone)}</p>}
                  </>
                ) : (
                  <span className="text-muted-foreground">Nenhum contato vinculado</span>
                )}
              </Row>
              {a.duration ? <Row icon={Clock}>{a.duration} min</Row> : null}
              {!!a.attendees?.length && <Row icon={Users}>{a.attendees.join(', ')}</Row>}
              {a.description && <Row icon={AlignLeft}><p className="whitespace-pre-wrap break-words">{a.description}</p></Row>}
            </div>

            <div className="px-4 py-3 flex justify-end gap-2 border-t border-border bg-muted">
              {phone && (
                <Button variant="ghost" size="sm" onClick={() => navigate(`/chat?contact=${encodeURIComponent(phone)}`)}>
                  <MessageSquare className="w-4 h-4 mr-1.5" aria-hidden="true" /> Abrir conversa
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/scheduling')}>
                <Calendar className="w-4 h-4 mr-1.5" aria-hidden="true" /> Abrir na agenda
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
