import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Users, MessageSquare, CloudOff, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import { PageContainer, PageHeader } from '@/components/layout';
import { Contact } from '../types';
import { cn, contactDisplayName, formatPhone } from '@/lib/utils';
import { ContactAvatar } from '@/components/workspace/ContactAvatar';
import { ContactFormDialog, type ContactFormValues } from '@/components/contact/ContactFormDialog';

type ContactFilter = 'all' | 'lead' | 'unsaved';

const SEARCH_DEBOUNCE_MS = 300;

function formatLastContact(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

/** Section letter, WhatsApp-style: A–Z by display name, "#" for numbers/symbols. */
function sectionOf(name: string): string {
  const first = name.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [counts, setCounts] = useState<{ total: number; unsaved: number } | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    api.countContacts().then(setCounts).catch((error) => console.error('Erro ao contar contatos', error));
  }, []);

  // Search and "Não salvos" run on the server: the unfiltered list is capped,
  // so a client-side filter would miss contacts outside the recent window.
  const unsavedOnly = filter === 'unsaved';
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.fetchContacts(debouncedTerm || undefined, { unsavedOnly, limit: debouncedTerm ? 200 : 500 })
      .then((rows) => { if (!cancelled) { setContacts(rows); setFailed(false); } })
      .catch((error) => { console.error('Erro ao carregar contatos', error); if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedTerm, unsavedOnly]);

  const leadCount = useMemo(() => contacts.filter(c => c.status === 'lead').length, [contacts]);

  // Alphabetical sections, like WhatsApp's contact list.
  const sections = useMemo(() => {
    const visible = filter === 'lead' ? contacts.filter(c => c.status === 'lead') : contacts;
    const named = visible
      .map(c => ({ contact: c, label: contactDisplayName(c.name, c.phone) }))
      .sort((a, b) => {
        const sa = sectionOf(a.label), sb = sectionOf(b.label);
        if (sa !== sb) return sa === '#' ? 1 : sb === '#' ? -1 : sa.localeCompare(sb);
        return a.label.localeCompare(b.label, 'pt-BR');
      });
    const groups: Array<{ letter: string; items: typeof named }> = [];
    for (const item of named) {
      const letter = sectionOf(item.label);
      const last = groups[groups.length - 1];
      if (last?.letter === letter) last.items.push(item); else groups.push({ letter, items: [item] });
    }
    return { groups, total: visible.length };
  }, [contacts, filter]);

  const openConversation = (contact: Contact) => {
    navigate(`/chat?contact=${encodeURIComponent(contact.phone)}`);
  };

  const editingInitial = useMemo<ContactFormValues>(() => ({
    name: editing?.rawName ?? '',
    call_name: editing?.callName ?? '',
    email: editing?.email ?? '',
  }), [editing]);

  const handleSubmitContact = async (values: ContactFormValues) => {
    if (!editing) return;
    const wasSaved = !!editing.saved;
    const fields = { name: values.name, call_name: values.call_name, email: values.email };
    try {
      if (wasSaved) await api.updateContact(editing.id, fields);
      else await api.saveContact(editing.id, fields);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Erro ao salvar contato');
      return;
    }
    const name = values.name.trim();
    const callName = values.call_name.trim() || name.split(/\s+/)[0] || null;
    setContacts(prev => prev
      // Saved contacts leave the "Não salvos" list right away.
      .filter(c => !(unsavedOnly && c.id === editing.id))
      .map(c => c.id !== editing.id ? c : {
        ...c, name: name || callName || '', rawName: name || null, callName, email: values.email.trim(), saved: true,
      }));
    if (!wasSaved) setCounts(prev => prev && { ...prev, unsaved: Math.max(0, prev.unsaved - 1) });
    setEditing(null);
    toast.success(wasSaved ? 'Contato atualizado' : 'Contato salvo');
  };

  const chip = (value: ContactFilter, label: string, count?: number) => (
    <button
      type="button"
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
      className={cn(
        'flex flex-shrink-0 items-center gap-1.5 px-3 h-8 rounded-full text-sm whitespace-nowrap transition-colors',
        filter === value
          ? 'bg-primary-subtle text-primary-subtle-foreground font-medium'
          : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn('text-[11px] font-semibold min-w-4 h-4 px-1 flex items-center justify-center rounded-full tabular-nums',
          filter === value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  );

  const total = counts?.total ?? contacts.length;

  return (
    <PageContainer>
      {/* Reading column centred in the page; the header aligns with the list. */}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      <PageHeader
        title="Contatos"
        description={!counts && loading ? 'Carregando…' : `${total.toLocaleString('pt-BR')} contatos · ${leadCount.toLocaleString('pt-BR')} leads`}
      />

      <div className="w-full rounded-lg bg-card border border-border overflow-hidden flex flex-col min-h-[400px]">
        <div className="px-3 pt-3 pb-2 flex flex-col gap-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-icon pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              aria-label="Pesquisar contatos"
              placeholder="Pesquisar nome, telefone ou e-mail"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-10 bg-secondary border-0 rounded-full text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex items-center gap-2">
            {chip('all', 'Todos')}
            {chip('lead', 'Leads', leadCount)}
            {chip('unsaved', 'Não salvos', counts?.unsaved)}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-80 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">Carregando contatos…</span>
          </div>
        ) : failed ? (
          <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
            <CloudOff className="w-10 h-10 text-icon/40" aria-hidden="true" />
            <p className="text-base text-foreground">Não foi possível carregar os contatos</p>
            <p className="text-sm text-muted-foreground">Recarregue a página para tentar de novo.</p>
          </div>
        ) : sections.total === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 gap-2 px-6 text-center">
            <Users className="w-10 h-10 text-icon/40" aria-hidden="true" />
            <p className="text-base text-foreground">
              {filter === 'unsaved' && !searchTerm ? 'Todos os contatos estão salvos' : 'Nenhum contato encontrado'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filter === 'lead'
                ? 'Tente outro termo ou troque o filtro.'
                : filter === 'unsaved'
                  ? 'Quem mandar mensagem pela primeira vez aparece aqui até alguém salvar.'
                  : 'Os contatos aparecem aqui quando alguém manda mensagem ou é importado.'}
            </p>
          </div>
        ) : (
          <div role="list" aria-label="Contatos">
            {sections.groups.map(({ letter, items }) => (
              <section key={letter} aria-label={letter}>
                <h3 className="px-6 pt-5 pb-2 text-base text-primary">{letter}</h3>
                {items.map(({ contact, label }) => {
                  const last = formatLastContact(contact.lastContact);
                  return (
                    <div key={contact.id} role="listitem" className="group flex items-center hover:bg-accent transition-colors">
                      <button
                        type="button"
                        onClick={() => openConversation(contact)}
                        title="Abrir conversa"
                        className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-2 text-left focus-visible:ring-inset focus-visible:ring-offset-0"
                      >
                        <ContactAvatar src={contact.avatar} name={label} className="w-[49px] h-[49px] text-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0 py-3 border-b border-border flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[17px] leading-[21px] text-foreground truncate">{label}</span>
                              {contact.status === 'lead' && (
                                <span className="flex-shrink-0 px-1.5 h-[18px] rounded-full text-[11px] font-medium flex items-center bg-primary-subtle text-primary-subtle-foreground">
                                  Lead
                                </span>
                              )}
                              {!contact.saved && !contact.isGroup && (
                                <span className="flex-shrink-0 px-1.5 h-[18px] rounded-full text-[11px] font-medium flex items-center bg-secondary text-muted-foreground">
                                  Não salvo
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground truncate tabular-nums">
                              {formatPhone(contact.phone)}{contact.email ? ` · ${contact.email}` : ''}
                            </p>
                          </div>
                          {last && <span className="flex-shrink-0 text-xs text-muted-foreground tabular-nums">{last}</span>}
                          <MessageSquare className="w-5 h-5 flex-shrink-0 text-icon opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" aria-hidden="true" />
                        </div>
                      </button>
                      {!contact.isGroup && (
                        <button
                          type="button"
                          onClick={() => setEditing(contact)}
                          title={contact.saved ? 'Editar contato' : 'Salvar contato'}
                          aria-label={`${contact.saved ? 'Editar' : 'Salvar'} contato ${label}`}
                          className="mr-3 p-2 rounded-full text-icon hover:bg-card hover:text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>
      </div>

      <ContactFormDialog
        open={!!editing}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        mode={editing?.saved ? 'edit' : 'save'}
        phone={editing ? formatPhone(editing.phone) : ''}
        initial={editingInitial}
        onSubmit={handleSubmitContact}
      />
    </PageContainer>
  );
};

export default Contacts;
