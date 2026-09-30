import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Bot, User, Pause, Calendar, CloudOff, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SettingsPanel as Panel } from '@/components/settings/SettingsPanel';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { cn, contactDisplayName } from '@/lib/utils';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';
import { localDateString } from '@/lib/localDate';
import { AppointmentDetailDialog, type AppointmentDetail } from './AppointmentDetailDialog';

interface RecentConversation {
  id: string;
  contactName: string;
  avatar: string | null;
  lastMessageAt: string | null;
  status: 'nina' | 'human' | 'paused';
}

type UpcomingAppointment = AppointmentDetail;

const RECENT_LIMIT = 6;
const UPCOMING_DAYS = 3;

const statusConfig = {
  nina:   { icon: Bot,   label: 'Lu atendendo',       tone: 'text-primary' },
  human:  { icon: User,  label: 'Atendimento humano', tone: 'text-muted-foreground' },
  paused: { icon: Pause, label: 'Pausada',            tone: 'text-muted-foreground' },
};

/** WhatsApp's chat-list clock: time today, "Ontem", then the date. */
function formatListTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const Empty: React.FC<{ icon: React.ElementType; title: string; text: string }> = ({ icon: Icon, title, text }) => (
  <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
    <Icon className="w-8 h-8 text-icon/40" aria-hidden="true" />
    <p className="text-[15px] text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const RowsSkeleton: React.FC<{ avatar: string; rows: number }> = ({ avatar, rows }) => (
  <div className="px-6 pb-4 space-y-4 animate-pulse" aria-busy="true">
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="flex items-center gap-4">
        <div className={cn('bg-secondary flex-shrink-0', avatar)} />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-36 bg-secondary rounded" />
          <div className="h-2.5 w-24 bg-secondary/60 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const panelLink = 'text-sm text-primary hover:underline underline-offset-4 rounded-sm';

const OperationalSummary: React.FC = () => {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [convError, setConvError] = useState(false);
  const [apptError, setApptError] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<UpcomingAppointment | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = localDateString();
        const lastDay = localDateString(UPCOMING_DAYS);

        const [convRes, apptRes] = await Promise.all([
          supabase
            .from('conversations')
            .select('id, status, last_message_at, contact:contacts(name, phone_number, profile_picture_url)')
            .order('last_message_at', { ascending: false, nullsFirst: false })
            .limit(RECENT_LIMIT),
          supabase
            .from('appointments')
            .select('id, title, date, time, type, duration, description, attendees, user_id, metadata, contact:contacts(name, phone_number)')
            .gte('date', today)
            .lte('date', lastDay)
            .or('status.is.null,status.not.in.(cancelled,completed)')
            .order('date', { ascending: true })
            .order('time', { ascending: true })
            .limit(4),
        ]);

        setConvError(!!convRes.error);
        setConversations(
          (convRes.data ?? []).map((c: any) => ({
            id: c.id,
            contactName: contactDisplayName(c.contact?.name, c.contact?.phone_number, 'Desconhecido'),
            avatar: c.contact?.profile_picture_url ?? null,
            lastMessageAt: c.last_message_at,
            status: c.status in statusConfig ? c.status : 'paused',
          }))
        );

        setApptError(!!apptRes.error);
        setAppointments((apptRes.data ?? []) as unknown as UpcomingAppointment[]);
      } catch {
        setConvError(true);
        setApptError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const todayStr = localDateString();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
      <Panel title="Conversas recentes" action={<Link to="/chat" className={panelLink}>Abrir atendimento</Link>}>
        {loading ? (
          <RowsSkeleton avatar="w-[49px] h-[49px] rounded-full" rows={3} />
        ) : convError ? (
          <Empty icon={CloudOff} title="Não foi possível carregar as conversas" text="Clique em Atualizar para tentar de novo." />
        ) : conversations.length === 0 ? (
          <Empty icon={MessageSquare} title="Nenhuma conversa ainda" text="As conversas aparecem aqui assim que alguém mandar mensagem." />
        ) : (
          <ul className="pb-2">
            {conversations.map((conv) => {
              const st = statusConfig[conv.status];
              const StatusIcon = st.icon;
              return (
                <li key={conv.id} className="group/li">
                  <Link
                    to={`/chat?conversation=${conv.id}`}
                    className="flex items-center gap-4 pl-4 pr-6 hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0"
                  >
                    <ContactAvatar src={conv.avatar} name={conv.contactName} className="w-[49px] h-[49px] text-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[17px] leading-[21px] text-foreground truncate">{conv.contactName}</p>
                        <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{formatListTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className={cn('mt-0.5 flex items-center gap-1 text-sm truncate', st.tone)}>
                        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        {st.label}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Próximos agendamentos" action={<Link to="/scheduling" className={panelLink}>Abrir agenda</Link>}>
        {loading ? (
          <RowsSkeleton avatar="w-12 h-12 rounded-lg" rows={2} />
        ) : apptError ? (
          <Empty icon={CloudOff} title="Não foi possível carregar os agendamentos" text="Clique em Atualizar para tentar de novo." />
        ) : appointments.length === 0 ? (
          <Empty icon={Calendar} title="Nada marcado" text={`Nenhum agendamento hoje nem nos próximos ${UPCOMING_DAYS} dias.`} />
        ) : (
          <ul className="pb-2">
            {appointments.map((appt) => {
              const [y, m, d] = appt.date.split('-').map(Number);
              const day = new Date(y, m - 1, d);
              const isToday = appt.date === todayStr;
              const who = appt.contact?.name || appt.contact?.phone_number;
              return (
                <li key={appt.id} className="group/li">
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(appt)}
                    className="w-full flex items-center gap-4 pl-4 pr-6 text-left hover:bg-accent transition-colors focus-visible:ring-inset focus-visible:ring-offset-0"
                  >
                    <span
                      className={cn(
                        'w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0',
                        isToday ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-secondary text-foreground',
                      )}
                      aria-label={day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    >
                      <span className="text-[10px] font-medium leading-none" aria-hidden="true">
                        {isToday ? 'HOJE' : day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}
                      </span>
                      <span className="text-lg leading-6 tabular-nums" aria-hidden="true">{d}</span>
                    </span>
                    <div className="flex-1 min-w-0 py-3 border-b border-border group-last/li:border-b-0 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[17px] leading-[21px] text-foreground truncate">{appt.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground truncate tabular-nums">
                          {appt.time.slice(0, 5)} · {appointmentTypeLabel(appt.type)}{who ? ` · ${who}` : ''}
                        </p>
                      </div>
                      {appt.metadata?.source === 'nina_ai' && <Bot className="w-4 h-4 text-icon flex-shrink-0" aria-label="Criado pela Lu" />}
                      <ChevronRight className="w-5 h-5 text-icon flex-shrink-0" aria-hidden="true" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        onOpenChange={(open) => { if (!open) setSelectedAppointment(null); }}
      />
    </div>
  );
};

export { OperationalSummary };
