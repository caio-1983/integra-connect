import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/Button';

export interface ContactFormValues {
  name: string;
  call_name: string;
  email: string;
}

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'save' = first time the team stores this auto-created contact. */
  mode: 'save' | 'edit';
  /** Shown read-only — the number is the contact's identity on WhatsApp. */
  phone: string;
  initial: ContactFormValues;
  onSubmit: (values: ContactFormValues) => Promise<void>;
}

// Same field grammar as the Equipe/Agenda forms: underlined, green label.
const line = 'border-b-2 border-border focus-within:border-primary transition-colors';
const bare = 'w-full bg-transparent py-2 text-[15px] text-foreground outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground';
const label = 'text-sm text-primary';

export const ContactFormDialog: React.FC<ContactFormDialogProps> = ({
  open, onOpenChange, mode, phone, initial, onSubmit,
}) => {
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  // Apelido follows the first name until the attendant types one of their own.
  const [callNameTouched, setCallNameTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(initial);
    setCallNameTouched(!!initial.call_name && initial.call_name !== initial.name.split(/\s+/)[0]);
  }, [open, initial]);

  const setName = (name: string) => setV(prev => ({
    ...prev,
    name,
    call_name: callNameTouched ? prev.call_name : name.trim().split(/\s+/)[0] ?? '',
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(v); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <form onSubmit={submit} className="flex flex-col max-h-[88vh]">
          <div className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl font-normal text-foreground">
              {mode === 'save' ? 'Salvar contato' : 'Editar contato'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground tabular-nums">
              {phone}
            </DialogDescription>
          </div>

          <div className="px-6 py-3 space-y-5 overflow-y-auto">
            <div>
              <label htmlFor="ct-name" className={label}>Nome</label>
              <div className={line}>
                <input id="ct-name" required autoFocus value={v.name} onChange={e => setName(e.target.value)} placeholder="Ex.: Maria Souza" className={bare} />
              </div>
            </div>

            <div>
              <label htmlFor="ct-call" className={label}>Como chamar</label>
              <div className={line}>
                <input
                  id="ct-call"
                  value={v.call_name}
                  onChange={e => { setCallNameTouched(true); setV(prev => ({ ...prev, call_name: e.target.value })); }}
                  placeholder="Ex.: Maria"
                  className={bare}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ct-email" className={label}>E-mail (opcional)</label>
              <div className={line}>
                <input id="ct-email" type="email" value={v.email} onChange={e => setV(prev => ({ ...prev, email: e.target.value }))} placeholder="maria@email.com" className={bare} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !v.name.trim()} className="min-w-28">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-label="Salvando" /> : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
