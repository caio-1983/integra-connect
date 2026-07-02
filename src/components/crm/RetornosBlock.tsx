import React from 'react';
import { CalendarCheck, Clock } from 'lucide-react';
import { Appointment } from '@/types';

interface RetornosBlockProps {
  appointments: Appointment[];
}

const typeLabel: Record<string, string> = {
  demo:     'Demo',
  meeting:  'Reunião',
  support:  'Suporte',
  followup: 'Follow-up',
};

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + time;
}

export const RetornosBlock: React.FC<RetornosBlockProps> = ({ appointments }) => {
  if (appointments.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-xl border border-dashed border-border p-3 text-center">
          <CalendarCheck className="w-5 h-5 text-muted-foreground mx-auto mb-1 opacity-50" />
          <p className="text-xs text-muted-foreground">Nenhum retorno agendado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-1.5">
      {appointments.slice(0, 3).map(ap => (
        <div key={ap.id} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5">
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground leading-snug truncate">{ap.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDateTime(ap.date, ap.time)}</span>
              <span className="px-1 py-0.5 rounded bg-muted border border-border">
                {typeLabel[ap.type] ?? ap.type}
              </span>
            </div>
          </div>
        </div>
      ))}
      {appointments.length > 3 && (
        <p className="text-[10px] text-center text-muted-foreground">
          +{appointments.length - 3} agendamento{appointments.length - 3 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};
