import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import type { Appointment, Contact } from '@/types';
import { cn, contactDisplayName } from '@/lib/utils';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';
import { durationLabel, endTime } from './calendarUtils';

export interface AppointmentFormValues {
  title: string;
  date: string;
  time: string;
  duration: number;
  type: Appointment['type'];
  description: string;
  contactId: string;
  attendees: string;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial: AppointmentFormValues;
  contacts: Contact[];
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
}

const TYPES: Appointment['type'][] = ['demo', 'meeting', 'support', 'followup'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

// WhatsApp's underlined field: hairline at rest, green 2px on focus.
const line = 'border-b-2 border-border focus-within:border-primary transition-colors';
const bare = 'w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground';
const label = 'text-sm text-primary';

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    onClick={onClick}
    className={cn(
      'px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
      active ? 'bg-primary-subtle text-primary-subtle-foreground font-medium' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
    )}
  >
    {children}
  </button>
);

export const AppointmentFormDialog: React.FC<AppointmentFormDialogProps> = ({
  open, onOpenChange, mode, initial, contacts, onSubmit,
}) => {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setV(initial); }, [open, initial]);

  const set = <K extends keyof AppointmentFormValues>(k: K, val: AppointmentFormValues[K]) => setV(prev => ({ ...prev, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return;
    setSaving(true);
    try { await onSubmit(v); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <form onSubmit={submit} className="flex flex-col max-h-[88vh]">
          <div className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-normal text-foreground">
              {mode === 'create' ? 'Novo agendamento' : 'Editar agendamento'}
            </DialogTitle>
            <DialogDescription className="sr-only">Título, data, horário e contato do agendamento.</DialogDescription>
          </div>

          <div className="px-6 py-3 space-y-5 overflow-y-auto">
            <div className={line}>
              <input
                autoFocus
                required
                aria-label="Título"
                value={v.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Adicionar título"
                className={cn(bare, 'text-[22px] py-1.5')}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div>
                <label htmlFor="ap-date" className={label}>Data</label>
                <div className={line}>
                  <input id="ap-date" type="date" required value={v.date} onChange={e => set('date', e.target.value)} className={bare} />
                </div>
              </div>
              <div>
                <label htmlFor="ap-time" className={label}>Início</label>
                <div className={line}>
                  <input id="ap-time" type="time" required step={300} value={v.time} onChange={e => set('time', e.target.value)} className={cn(bare, 'tabular-nums')} />
                </div>
              </div>
            </div>

            <div>
              <span className={label} id="ap-dur">Duração <span className="text-muted-foreground">· termina às {endTime({ time: v.time, duration: v.duration })}</span></span>
              <div role="radiogroup" aria-labelledby="ap-dur" className="mt-2 flex flex-wrap gap-1.5">
                {DURATIONS.map(d => <Chip key={d} active={v.duration === d} onClick={() => set('duration', d)}>{durationLabel(d)}</Chip>)}
              </div>
            </div>

            <div>
              <span className={label} id="ap-type">Tipo</span>
              <div role="radiogroup" aria-labelledby="ap-type" className="mt-2 flex flex-wrap gap-1.5">
                {TYPES.map(t => <Chip key={t} active={v.type === t} onClick={() => set('type', t)}>{appointmentTypeLabel(t)}</Chip>)}
              </div>
            </div>

            <div>
              <label htmlFor="ap-contact" className={label}>Contato</label>
              <div className={line}>
                <select id="ap-contact" value={v.contactId} onChange={e => set('contactId', e.target.value)} className={cn(bare, 'bg-card')}>
                  <option value="">Nenhum</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{contactDisplayName(c.name, c.phone)} · {c.phone}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ap-att" className={label}>Participantes</label>
              <div className={line}>
                <input id="ap-att" value={v.attendees} onChange={e => set('attendees', e.target.value)} placeholder="João Silva, Maria Santos" className={bare} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Separe os nomes por vírgula.</p>
            </div>

            <div>
              <label htmlFor="ap-desc" className={label}>Descrição</label>
              <div className={line}>
                <textarea id="ap-desc" rows={3} value={v.description} onChange={e => set('description', e.target.value)} placeholder="Detalhes, endereço, link da chamada…" className={cn(bare, 'resize-none')} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !v.title.trim()} className="min-w-24">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Salvando" /> : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
