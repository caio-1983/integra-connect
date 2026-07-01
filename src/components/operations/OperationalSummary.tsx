import React, { useEffect, useState } from 'react';
import { MessageSquare, Clock, Bot, User, Pause, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { cn } from '@/lib/utils';

interface RecentConversation {
  id: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  status: 'nina' | 'human' | 'paused';
  unreadCount: number;
}

interface UpcomingAppointment {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
}

const statusConfig = {
  nina:   { icon: Bot,   label: 'IA',       color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  human:  { icon: User,  label: 'Humano',   color: 'text-violet-700 bg-violet-50 border-violet-200' },
  paused: { icon: Pause, label: 'Pausada',  color: 'text-muted-foreground bg-muted border-border' },
};

const appointmentTypeColor: Record<string, string> = {
  demo:     'text-cyan-600',
  meeting:  'text-violet-600',
  support:  'text-emerald-600',
  followup: 'text-amber-600',
};

function formatRelative(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  return `${diffDays}d`;
}

const OperationalSummary: React.FC = () => {
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

        const [convRes, apptRes] = await Promise.all([
          supabase
            .from('conversations')
            .select('id, status, last_message_at, contact:contacts(name, phone_number), tags')
            .order('last_message_at', { ascending: false })
            .limit(6),
          supabase
            .from('appointments')
            .select('id, title, date, time, type')
            .gte('date', today)
            .lte('date', tomorrow)
            .order('date', { ascending: true })
            .order('time', { ascending: true })
            .limit(4),
        ]);

        if (convRes.data) {
          setConversations(
            convRes.data.map((c: any) => ({
              id: c.id,
              contactName: c.contact?.name || c.contact?.phone_number || 'Desconhecido',
              lastMessage: '',
              lastMessageAt: c.last_message_at,
              status: c.status,
              unreadCount: 0,
            }))
          );
        }

        if (apptRes.data) {
          setAppointments(apptRes.data as UpcomingAppointment[]);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map(col => (
          <div key={col} className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
            <div className="h-3 w-28 bg-muted rounded" />
            {[1, 2, 3].map(r => (
              <div key={r} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 bg-muted rounded" />
                  <div className="h-2 w-36 bg-muted/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Conversas recentes */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Conversas Recentes</span>
          </div>
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground">{conversations.length} ativas</span>
          )}
        </div>

        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma conversa recente"
            description="As conversas ativas aparecerão aqui assim que os primeiros atendimentos iniciarem."
            compact
            className="m-3 border-border/60"
          />
        ) : (
          <ul className="divide-y divide-border">
            {conversations.map((conv) => {
              const statusCfg = statusConfig[conv.status];
              const StatusIcon = statusCfg.icon;
              return (
                <li
                  key={conv.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0 uppercase">
                    {conv.contactName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-none">{conv.contactName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelative(conv.lastMessageAt)}</p>
                  </div>
                  <div className={cn('flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0', statusCfg.color)}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {statusCfg.label}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Agendamentos próximos */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Próximos Agendamentos</span>
          </div>
          {appointments.length > 0 && (
            <span className="text-xs text-muted-foreground">próximos 3 dias</span>
          )}
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nenhum agendamento próximo"
            description="Agendamentos dos próximos 3 dias aparecerão aqui."
            compact
            className="m-3 border-border/60"
          />
        ) : (
          <ul className="divide-y divide-border">
            {appointments.map((appt) => {
              const typeColor = appointmentTypeColor[appt.type] || 'text-muted-foreground';
              return (
                <li key={appt.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border flex-shrink-0">
                    <Clock className={cn('w-3.5 h-3.5', typeColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-none">{appt.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {appt.date.split('-').reverse().join('/')} às {appt.time}
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide flex-shrink-0', typeColor)}>
                    {appt.type}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export { OperationalSummary };
