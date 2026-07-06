import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Clock, Plus, Loader2, X } from 'lucide-react';
import { Appointment } from '@/types';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface AgendamentoBlockProps {
  contactId: string;
  contactName: string;
}

const typeLabel: Record<string, string> = {
  demo:     'Demo',
  meeting:  'Reunião',
  support:  'Suporte',
  followup: 'Retorno',
};

function formatDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + time;
}

/** Tomorrow as local YYYY-MM-DD (avoids the UTC shift toISOString would cause). */
function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Real appointments for a single contact, filtered from the shared
 * `appointments` table — the same store the /scheduling calendar reads/writes,
 * so a return scheduled here shows up there and vice-versa. Includes a compact
 * inline form to schedule a follow-up ("retornar o contato") without leaving
 * the conversation.
 */
export const AgendamentoBlock: React.FC<AgendamentoBlockProps> = ({ contactId, contactName }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(tomorrowStr());
  const [time, setTime] = useState('09:00');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    try {
      const all = await api.fetchAppointments();
      setAppointments(all.filter(a => a.contact_id === contactId));
    } catch (e) {
      console.error('[AgendamentoBlock] erro ao carregar', e);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!date) { toast.error('Escolha uma data'); return; }
    setSaving(true);
    try {
      await api.createAppointment({
        title: `Retornar ${contactName}`,
        description: description.trim() || undefined,
        date,
        time,
        type: 'followup',
        duration: 30,
        contact_id: contactId,
      });
      toast.success('Retorno agendado');
      setFormOpen(false);
      setDate(tomorrowStr());
      setTime('09:00');
      setDescription('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao agendar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 space-y-2">
      {formOpen ? (
        <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-0 bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-[84px] bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:ring-1 focus:ring-ring/50 outline-none"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional) — ex.: motivo do retorno"
            rows={2}
            className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring/50 outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-primary text-white text-xs font-medium py-1.5 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarCheck className="w-3 h-3" />}
              Agendar retorno
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setFormOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-ring/50 hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agendar retorno
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-1">Nenhum agendamento</p>
      ) : (
        <div className="space-y-1.5">
          {appointments.slice(0, 4).map(ap => (
            <div key={ap.id} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2.5">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug truncate">{ap.title}</p>
                {ap.description && (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">{ap.description}</p>
                )}
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
          {appointments.length > 4 && (
            <p className="text-[10px] text-center text-muted-foreground">
              +{appointments.length - 4} agendamento{appointments.length - 4 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
