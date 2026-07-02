import React from 'react';
import {
  Phone, Mail, MapPin, Globe, Building2, User, Tag,
  MessageSquare, TrendingUp, CheckSquare, Clock, FileText,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Person } from '@/types';
import { MOCK_DEALS, MOCK_TASKS, MOCK_COMPANIES, MOCK_TIMELINE_ENTRIES } from '@/constants';
import { Timeline } from './Timeline';
import { TaskList } from './TaskList';
import { useNavigate } from 'react-router-dom';

interface PersonSheetProps {
  person: Person | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  lead:     { label: 'Lead',          color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  customer: { label: 'Cliente Ativo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  churned:  { label: 'Churned',       color: 'bg-muted text-muted-foreground border-border' },
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export const PersonSheet: React.FC<PersonSheetProps> = ({ person, open, onOpenChange }) => {
  const navigate = useNavigate();

  if (!person) return null;

  const deals = MOCK_DEALS.filter(d => d.contactId === person.id);
  const tasks = MOCK_TASKS.filter(t => t.personId === person.id);
  const timeline = MOCK_TIMELINE_ENTRIES.filter(e => e.personId === person.id);
  const company = MOCK_COMPANIES.find(c => c.id === person.companyId);
  const st = statusLabel[person.status] ?? statusLabel['lead'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-border overflow-y-auto p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Pessoa: {person.name}</SheetTitle>
        </SheetHeader>

        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
              {initials(person.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{person.name}</h2>
              {person.company && (
                <p className="text-sm text-muted-foreground">{person.company}</p>
              )}
              <div className="mt-1">
                <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>
                  {st.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Contato */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Contato</h3>
            <div className="space-y-2">
              {person.phones.map(p => (
                <div key={p} className="flex items-center gap-2 text-sm text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  {p}
                  {p === person.whatsapp && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">WhatsApp</span>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                {person.email}
              </div>
              {(person.city || person.state) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {[person.city, person.state].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </section>

          {/* Empresa */}
          {company && (
            <section>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Empresa</h3>
              <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{company.nomeFantasia ?? company.razaoSocial}</p>
                {company.segmento && <p className="text-xs text-muted-foreground">{company.segmento}</p>}
                {company.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {company.cnpj}</p>}
              </div>
            </section>
          )}

          {/* CRM */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">CRM</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {person.ownerId && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  {person.ownerName ?? 'Sem responsável'}
                </div>
              )}
              {person.origin && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  {person.origin}
                </div>
              )}
              {person.document && (
                <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  {person.document}
                </div>
              )}
            </div>
            {person.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {person.tags.map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          {person.notes && (
            <section>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Observações</h3>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted rounded-xl p-3">
                {person.notes}
              </p>
            </section>
          )}

          {/* Negócios */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Negócios ({deals.length})
              </h3>
              <button
                onClick={() => { onOpenChange(false); navigate('/pipeline'); }}
                className="text-[10px] text-primary hover:underline"
              >
                Ver Kanban
              </button>
            </div>
            {deals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum negócio vinculado.</p>
            ) : (
              <div className="space-y-2">
                {deals.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs">
                    <div>
                      <p className="font-medium text-foreground">{d.title}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                      {d.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tarefas */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Tarefas ({tasks.length})
            </h3>
            <TaskList tasks={tasks} />
          </section>

          {/* Timeline */}
          <section>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Timeline</h3>
            <Timeline entries={timeline} />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};
