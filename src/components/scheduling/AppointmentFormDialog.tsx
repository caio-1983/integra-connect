import React, { useEffect, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';
import type { Appointment, Contact } from '@/types';
import { cn, contactDisplayName } from '@/lib/utils';
import { appointmentTypeLabel } from '@/lib/appointmentTypes';
import { durationLabel, endTime } from './calendarUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CUSTOM_REMINDER_OPTIONS, minutesBeforeLabel, type AppointmentReminderSettings } from '@/lib/reminders';

export interface AppointmentFormValues {
  title: string;
  date: string;
  time: string;
  duration: number;
  type: Appointment['type'];
  description: string;
  contactId: string;
  attendees: string;
  /** null = não deu para carregar os lembretes atuais; a seção some e salvar não mexe neles. */
  reminders: AppointmentReminderSettings | null;
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

const ToggleChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={active}
    onClick={onClick}
    className={cn(
      'px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1',
      active ? 'bg-primary-subtle text-primary-subtle-foreground font-medium' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
    )}
  >
    {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
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

  const r = v.reminders;
  const setReminders = (next: AppointmentReminderSettings) => set('reminders', next);
  const availableCustom = r ? CUSTOM_REMINDER_OPTIONS.filter(m => !r.customMinutes.includes(m)) : [];

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

            {r && (
              <div>
                <span className={label} id="ap-rem">Lembretes</span>
                <div role="group" aria-labelledby="ap-rem" className="mt-2 flex flex-wrap gap-1.5">
                  <ToggleChip active={r.dayBefore} onClick={() => setReminders({ ...r, dayBefore: !r.dayBefore })}>Na véspera</ToggleChip>
                  <ToggleChip active={r.sameDay} onClick={() => setReminders({ ...r, sameDay: !r.sameDay })}>No dia</ToggleChip>
                  {[...r.customMinutes].sort((a, b) => b - a).map(m => (
                    <span key={m} className="pl-3 pr-1 h-8 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-0.5 bg-primary-subtle text-primary-subtle-foreground">
                      {minutesBeforeLabel(m)}
                      <button
                        type="button"
                        aria-label={`Remover lembrete ${minutesBeforeLabel(m)}`}
                        onClick={() => setReminders({ ...r, customMinutes: r.customMinutes.filter(x => x !== m) })}
                        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-primary/15 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {availableCustom.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="px-3 h-8 rounded-full text-sm whitespace-nowrap flex items-center gap-1 bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                          <Plus className="w-4 h-4" aria-hidden="true" /> Adicionar
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {availableCustom.map(m => (
                          <DropdownMenuItem key={m} onSelect={() => setReminders({ ...r, customMinutes: [...r.customMinutes, m] })}>
                            {minutesBeforeLabel(m)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Na véspera e no dia, o aviso aparece quando o responsável entra no sistema.</p>
              </div>
            )}

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
