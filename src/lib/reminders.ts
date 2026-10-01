/**
 * Lembretes de agendamento: tipos e rótulos compartilhados pela Agenda, pelo
 * sino e pelo aviso de entrada. As regras de quando cada lembrete libera
 * vivem no banco (20261001110000_appointment_reminders).
 */

export interface AppointmentReminderSettings {
  /** Véspera: aparece quando o responsável entra no sistema no dia anterior. */
  dayBefore: boolean;
  /** No dia: aparece quando o responsável entra no sistema no próprio dia. */
  sameDay: boolean;
  /** Lembretes com hora exata, em minutos antes do início. */
  customMinutes: number[];
}

export const DEFAULT_REMINDERS: AppointmentReminderSettings = { dayBefore: true, sameDay: true, customMinutes: [] };

/** Opções do "+ Adicionar lembrete", em minutos antes do início. */
export const CUSTOM_REMINDER_OPTIONS = [15, 30, 60, 120, 1440, 2880, 10080];

export function minutesBeforeLabel(minutes: number): string {
  if (minutes % 10080 === 0) {
    const w = minutes / 10080;
    return `${w} ${w === 1 ? 'semana' : 'semanas'} antes`;
  }
  if (minutes % 1440 === 0) {
    const d = minutes / 1440;
    return `${d} ${d === 1 ? 'dia' : 'dias'} antes`;
  }
  if (minutes % 60 === 0) return `${minutes / 60} h antes`;
  return `${minutes} min antes`;
}

/** "Na véspera · No dia · 30 min antes", ou "Sem lembretes". */
export function remindersSummary(r: AppointmentReminderSettings): string {
  const parts = [
    ...(r.dayBefore ? ['Na véspera'] : []),
    ...(r.sameDay ? ['No dia'] : []),
    ...[...r.customMinutes].sort((a, b) => b - a).map(minutesBeforeLabel),
  ];
  return parts.length ? parts.join(' · ') : 'Sem lembretes';
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entityId: string | null;
  /** Quando acontece aquilo que o aviso lembra (início do agendamento). */
  eventAt: string | null;
  createdAt: string;
  readAt: string | null;
}

/** Aviso que ainda pede atenção: não lido e de algo que ainda não aconteceu. */
export function isPending(n: AppNotification, now = new Date()): boolean {
  return !n.readAt && (!n.eventAt || new Date(n.eventAt).getTime() > now.getTime());
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Quando é, contado a partir de agora: "Em 25 min", "Hoje às 15:00",
 * "Amanhã às 09:30", "Sex, 3 out às 10:00". Calculado na hora de mostrar,
 * então um aviso de véspera lido só no dia seguinte já diz "Hoje".
 */
export function whenLabel(eventAt: string, now = new Date()): string {
  const d = new Date(eventAt);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return `Começou às ${time}`;
  if (diffMin < 60) return `Em ${diffMin} min · ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (dayKey(d) === dayKey(now)) return `Hoje às ${time}`;
  if (dayKey(d) === dayKey(tomorrow)) return `Amanhã às ${time}`;
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} às ${time}`;
}
