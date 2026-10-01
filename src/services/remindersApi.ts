import { supabase } from '@/integrations/supabase/client';
import type { AppNotification, AppointmentReminderSettings } from '@/lib/reminders';

// notifications e appointment_reminders ainda não estão nos tipos gerados do
// Supabase, por isso o cast (mesmo padrão de tasks e conversation_pins).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type NotificationRow = {
  id: string; type: string; title: string; body: string | null; link: string | null;
  entity_id: string | null; event_at: string | null; created_at: string; read_at: string | null;
};

export const toAppNotification = (r: NotificationRow): AppNotification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body,
  link: r.link,
  entityId: r.entity_id,
  eventAt: r.event_at,
  createdAt: r.created_at,
  readAt: r.read_at,
});

export const remindersApi = {
  /** Avisos recentes da pessoa logada (a RLS só devolve os dela). */
  fetchNotifications: async (userId: string, limit = 50): Promise<AppNotification[]> => {
    const { data, error } = await db
      .from('notifications')
      .select('id, type, title, body, link, entity_id, event_at, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data ?? []) as NotificationRow[]).map(toAppNotification);
  },

  markNotificationsRead: async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    const { error } = await db
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .is('read_at', null);
    if (error) throw error;
  },

  fetchAppointmentReminders: async (appointmentId: string): Promise<AppointmentReminderSettings> => {
    const { data, error } = await db
      .from('appointment_reminders')
      .select('kind, minutes_before')
      .eq('appointment_id', appointmentId);
    if (error) throw error;
    const rows = (data ?? []) as { kind: string; minutes_before: number | null }[];
    return {
      dayBefore: rows.some(r => r.kind === 'day_before'),
      sameDay: rows.some(r => r.kind === 'same_day'),
      customMinutes: rows.filter(r => r.kind === 'custom' && r.minutes_before).map(r => r.minutes_before as number),
    };
  },

  /** Substitui o conjunto de lembretes do agendamento. */
  setAppointmentReminders: async (appointmentId: string, r: AppointmentReminderSettings): Promise<void> => {
    const { error } = await db.rpc('set_appointment_reminders', {
      p_appointment_id: appointmentId,
      p_day_before: r.dayBefore,
      p_same_day: r.sameDay,
      p_custom_minutes: r.customMinutes,
    });
    if (error) throw error;
  },
};
