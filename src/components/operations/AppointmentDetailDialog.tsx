import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Calendar, Clock, Loader2, Phone, UserCircle, UserCheck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';

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

const Row: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  </div>
);

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
    if (createdByAI) {
      return <span className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-cyan-600" /> Agendado pela IA</span>;
    }
    if (loadingScheduler) return <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />;
    return schedulerName ?? <span className="text-muted-foreground">Não identificado</span>;
  };

  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {appointment && (
          <>
            <DialogHeader>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {appointmentTypeLabel(appointment.type)}
              </p>
              <DialogTitle>{appointment.title}</DialogTitle>
              {appointment.description && (
                <DialogDescription className="whitespace-pre-wrap">{appointment.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              <Row icon={UserCheck} label="Responsável pelo contato (quem agendou)">
                {renderScheduler()}
              </Row>

              <Row icon={UserCircle} label="Cliente">
                {appointment.contact ? (
                  <>
                    <p>{appointment.contact.name || 'Sem nome'}</p>
                    {appointment.contact.phone_number && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {appointment.contact.phone_number}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Nenhum contato vinculado</span>
                )}
              </Row>

              <div className="grid grid-cols-2 gap-4">
                <Row icon={Calendar} label="Data">
                  {appointment.date.split('-').reverse().join('/')}
                </Row>
                <Row icon={Clock} label="Horário">
                  {appointment.time.slice(0, 5)}{appointment.duration ? ` · ${appointment.duration}min` : ''}
                </Row>
              </div>

              {appointment.attendees && appointment.attendees.length > 0 && (
                <Row icon={Users} label="Participantes">
                  {appointment.attendees.join(', ')}
                </Row>
              )}
            </div>

            <Button variant="outline" onClick={() => navigate('/scheduling')}>
              <Calendar className="w-4 h-4 mr-2" /> Abrir na agenda
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
